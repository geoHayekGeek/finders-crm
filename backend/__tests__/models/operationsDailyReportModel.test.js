const operationsDailyReportModel = require('../../models/operationsDailyReportModel');
const pool = require('../../config/db');
const { DAILY_INSERT_FIELDS } = operationsDailyReportModel;

jest.mock('../../config/db');

describe('Operations Daily Report Model', () => {
  let mockQuery;
  let mockClient;

  const reportDate = '2024-01-15';
  const operationsId = 1;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    pool.query = mockQuery;
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function queueDailyCalculationResponses({
    operationsName = 'Operations User',
    propertiesAdded = 5,
    leadsResponded = 3,
    amending = 2
  } = {}) {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: operationsId, name: operationsName }] })
      .mockResolvedValueOnce({ rows: [{ count: String(propertiesAdded) }] })
      .mockResolvedValueOnce({ rows: [{ count: String(leadsResponded) }] })
      .mockResolvedValueOnce({ rows: [{ count: String(amending) }] });
  }

  function buildExpectedPayloadRow(inputFields, calculatedData, name = 'Operations User') {
    const payload = {
      operations_id: operationsId,
      operations_name: name,
      report_date: reportDate
    };

    DAILY_INSERT_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(inputFields, field)) {
        payload[field] = inputFields[field];
        return;
      }

      if (Object.prototype.hasOwnProperty.call(calculatedData, field)) {
        payload[field] = calculatedData[field];
        return;
      }

      payload[field] = 0;
    });

    return payload;
  }

  function expectedInsertValues(inputFields, calculatedData, name = 'Operations User') {
    const payloadRow = buildExpectedPayloadRow(inputFields, calculatedData, name);

    return [
      operationsId,
      name,
      reportDate,
      JSON.stringify([payloadRow]),
      ...DAILY_INSERT_FIELDS.map((field) => payloadRow[field] ?? 0)
    ];
  }

  function expectedBulkInsertValues(rows) {
    const payloadRows = rows.map((row) => {
      const payload = {
        operations_id: row.operations_id,
        operations_name: row.operations_name || `Operations ${row.operations_id}`,
        report_date: reportDate
      };

      DAILY_INSERT_FIELDS.forEach((field) => {
        payload[field] = Object.prototype.hasOwnProperty.call(row, field) ? row[field] : 0;
      });

      return payload;
    });

    const summaryValues = DAILY_INSERT_FIELDS.map((field) => (
      payloadRows.reduce((total, row) => total + (row[field] || 0), 0)
    ));

    return [
      payloadRows[0].operations_id,
      payloadRows.map((row) => row.operations_name).join(' + '),
      reportDate,
      JSON.stringify(payloadRows),
      ...summaryValues
    ];
  }

  describe('calculateDailyData', () => {
    it('returns calculated values for the selected operations user and date', async () => {
      queueDailyCalculationResponses();

      const result = await operationsDailyReportModel.calculateDailyData(operationsId, reportDate);

      expect(result).toEqual({
        operations_id: operationsId,
        operations_name: 'Operations User',
        report_date: reportDate,
        properties_added: 5,
        leads_responded_to: 3,
        amending_previous_properties: 2
      });
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query.mock.calls[1][0]).toContain("created_by = $1");
      expect(mockClient.query.mock.calls[3][0]).toContain("DATE(created_at AT TIME ZONE 'UTC') < $2::date");
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rejects invalid operations users', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        operationsDailyReportModel.calculateDailyData(999, reportDate)
      ).rejects.toThrow('Invalid operations user ID');
    });
  });

  describe('createReport', () => {
    it('inserts workbook values with calculated overrides and manual fields', async () => {
      const inputFields = {
        properties_added: 12,
        amending_previous_properties: 9,
        preparing_daily_report: 4,
        phone_calls_duty_time: 5,
        replying_to_msg_on_sm_duty_time: 6,
        cvs: 7,
        filling: 8,
        preparing_contract: 10,
        tasks_efficiency: 11,
        phone_calls_out_of_duty_time: 12,
        replying_to_msg_on_sm_out_of_duty_time: 13,
        replying_to_whats_up_msg_out_of_duty_time: 14,
        leads_responded_to: 15,
        leads_responded_out_of_duty_time: 1,
        tasks_efficiency_duty_time: 2,
        tasks_efficiency_uniform: 3,
        tasks_efficiency_after_duty: 4
      };

      const calculatedData = {
        properties_added: 5,
        leads_responded_to: 3,
        amending_previous_properties: 2
      };
      const createdRow = {
        id: 11,
        operations_id: operationsId,
        operations_name: 'Operations User',
        report_date: reportDate,
        operations_rows: [buildExpectedPayloadRow(inputFields, calculatedData)],
        ...inputFields
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createdRow] });

      queueDailyCalculationResponses();

      const result = await operationsDailyReportModel.createReport(operationsId, reportDate, inputFields);

      expect(result).toEqual(createdRow);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO operations_daily_reports');
      expect(mockQuery.mock.calls[1][1]).toEqual(expectedInsertValues(inputFields, calculatedData));
    });

    it('rejects duplicate reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await expect(
        operationsDailyReportModel.createReport(operationsId, reportDate)
      ).rejects.toThrow('A report already exists');
    });
  });

  describe('createReportsBulk', () => {
    it('creates one combined report for multiple selected operations users', async () => {
      const bulkRows = [
        {
          operations_id: 1,
          operations_name: 'Operations One',
          preparing_daily_report: 2,
          phone_calls_duty_time: 3,
          tasks_efficiency: 4,
          properties_added: 5,
          leads_responded_to: 6,
          amending_previous_properties: 7
        },
        {
          operations_id: 2,
          operations_name: 'Operations Two',
          preparing_daily_report: 1,
          phone_calls_duty_time: 5,
          tasks_efficiency: 6,
          properties_added: 8,
          leads_responded_to: 9,
          amending_previous_properties: 10
        }
      ];
      const payloadRows = bulkRows.map((row) => ({
        operations_id: row.operations_id,
        operations_name: row.operations_name,
        report_date: reportDate,
        preparing_daily_report: row.preparing_daily_report,
        phone_calls_duty_time: row.phone_calls_duty_time,
        replying_to_msg_on_sm_duty_time: row.replying_to_msg_on_sm_duty_time || 0,
        cvs: row.cvs || 0,
        amending_previous_properties: row.amending_previous_properties,
        filling: row.filling || 0,
        preparing_contract: row.preparing_contract || 0,
        tasks_efficiency: row.tasks_efficiency,
        phone_calls_out_of_duty_time: row.phone_calls_out_of_duty_time || 0,
        replying_to_msg_on_sm_out_of_duty_time: row.replying_to_msg_on_sm_out_of_duty_time || 0,
        replying_to_whats_up_msg_out_of_duty_time: row.replying_to_whats_up_msg_out_of_duty_time || 0,
        leads_responded_to: row.leads_responded_to,
        leads_responded_out_of_duty_time: row.leads_responded_out_of_duty_time || 0,
        tasks_efficiency_duty_time: row.tasks_efficiency_duty_time || 0,
        tasks_efficiency_uniform: row.tasks_efficiency_uniform || 0,
        tasks_efficiency_after_duty: row.tasks_efficiency_after_duty || 0
      }));
      const createdRow = {
        id: 21,
        operations_id: 1,
        operations_name: 'Operations One + Operations Two',
        report_date: reportDate,
        operations_rows: payloadRows,
        preparing_daily_report: 3,
        phone_calls_duty_time: 8,
        replying_to_msg_on_sm_duty_time: 0,
        cvs: 0,
        amending_previous_properties: 17,
        filling: 0,
        preparing_contract: 0,
        tasks_efficiency: 10,
        phone_calls_out_of_duty_time: 0,
        replying_to_msg_on_sm_out_of_duty_time: 0,
        replying_to_whats_up_msg_out_of_duty_time: 0,
        leads_responded_to: 15,
        leads_responded_out_of_duty_time: 0,
        tasks_efficiency_duty_time: 0,
        tasks_efficiency_uniform: 0,
        tasks_efficiency_after_duty: 0,
        properties_added: 13
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // existing check
        .mockResolvedValueOnce({ rows: [createdRow] }) // insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await operationsDailyReportModel.createReportsBulk(
        bulkRows,
        reportDate
      );

      expect(result.created).toHaveLength(1);
      expect(result.created[0]).toEqual(createdRow);
      expect(result.skipped).toHaveLength(0);
      expect(result.report_date).toBe(reportDate);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'SELECT id FROM operations_daily_reports WHERE operations_id = $1 AND report_date = $2', [1, reportDate]);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO operations_daily_reports'), expectedBulkInsertValues(bulkRows));
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getAllReports', () => {
    it('applies report filters to the query', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await operationsDailyReportModel.getAllReports({
        operations_id: 7,
        report_date: reportDate,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND operations_id = $1'),
        [7, reportDate, '2024-01-01', '2024-01-31']
      );
    });
  });

  describe('updateReport', () => {
    it('updates manual workbook fields', async () => {
      const reportId = 42;
      const existingReport = {
        id: reportId,
        operations_id: operationsId,
        operations_name: 'Operations User',
        report_date: reportDate
      };
      const updatedRow = {
        ...existingReport,
        preparing_contract: 4,
        tasks_efficiency: -2,
        leads_responded_out_of_duty_time: 1,
        operations_rows: [
          buildExpectedPayloadRow(
            {
              preparing_contract: 4,
              tasks_efficiency: -2,
              leads_responded_out_of_duty_time: 1
            },
            {},
            'Operations User'
          )
        ]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existingReport] })
        .mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await operationsDailyReportModel.updateReport(reportId, {
        preparing_contract: 4,
        tasks_efficiency: -2,
        leads_responded_out_of_duty_time: 1
      });

      expect(result).toEqual(updatedRow);
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE operations_daily_reports');
      expect(mockQuery.mock.calls[1][1]).toEqual(expect.arrayContaining([
        operationsId,
        'Operations User',
        JSON.stringify([updatedRow.operations_rows[0]]),
        reportId
      ]));
    });

    it('recalculates calculated fields when requested', async () => {
      const reportId = 43;
      const existingReport = {
        id: reportId,
        operations_id: operationsId,
        operations_name: 'Operations User',
        report_date: reportDate
      };
      const recalculatedRow = {
        ...existingReport,
        properties_added: 5,
        leads_responded_to: 3,
        amending_previous_properties: 2,
        operations_rows: [
          buildExpectedPayloadRow(
            {
              properties_added: 5,
              leads_responded_to: 3,
              amending_previous_properties: 2
            },
            {},
            'Operations User'
          )
        ]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existingReport] })
        .mockResolvedValueOnce({ rows: [recalculatedRow] });

      queueDailyCalculationResponses();

      const result = await operationsDailyReportModel.updateReport(reportId, {
        recalculate: true
      });

      expect(result).toEqual(recalculatedRow);
      expect(mockQuery.mock.calls[1][1]).toEqual(expect.arrayContaining([
        operationsId,
        'Operations User',
        JSON.stringify([recalculatedRow.operations_rows[0]]),
        reportId
      ]));
    });
  });

  describe('recalculateReport', () => {
    it('reuses the update path for recalculation', async () => {
      const reportId = 44;
      const existingReport = {
        id: reportId,
        operations_id: operationsId,
        operations_name: 'Operations User',
        report_date: reportDate
      };
      const recalculatedRow = {
        ...existingReport,
        properties_added: 5,
        leads_responded_to: 3,
        amending_previous_properties: 2,
        operations_rows: [
          buildExpectedPayloadRow(
            {
              properties_added: 5,
              leads_responded_to: 3,
              amending_previous_properties: 2
            },
            {},
            'Operations User'
          )
        ]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existingReport] })
        .mockResolvedValueOnce({ rows: [recalculatedRow] });

      queueDailyCalculationResponses();

      await expect(operationsDailyReportModel.recalculateReport(reportId)).resolves.toEqual(recalculatedRow);
    });
  });

  describe('getReportById and deleteReport', () => {
    it('returns a report by id and deletes reports safely', async () => {
      const reportId = 55;
      const reportRow = { id: reportId, operations_id: operationsId, report_date: reportDate };

      mockQuery.mockResolvedValueOnce({ rows: [reportRow] });
      await expect(operationsDailyReportModel.getReportById(reportId)).resolves.toEqual(reportRow);

      mockQuery.mockResolvedValueOnce({ rows: [reportRow] });
      await expect(operationsDailyReportModel.deleteReport(reportId)).resolves.toEqual(reportRow);
    });
  });
});
