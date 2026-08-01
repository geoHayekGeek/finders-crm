const operationsDailyExporter = require('../../utils/operationsDailyExporter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

jest.mock('exceljs');
jest.mock('pdfkit');

function createMockWorksheet() {
  const cells = new Map();
  const rows = new Map();

  return {
    cells,
    rows,
    columns: [],
    getRow: jest.fn((rowNumber) => {
      if (!rows.has(rowNumber)) {
        rows.set(rowNumber, { height: 0 });
      }
      return rows.get(rowNumber);
    }),
    getCell: jest.fn((rowNumber, columnNumber) => {
      const key = `${rowNumber}:${columnNumber}`;
      if (!cells.has(key)) {
        cells.set(key, {
          value: null,
          font: {},
          fill: {},
          border: {},
          alignment: {},
          numFmt: undefined
        });
      }

      return cells.get(key);
    })
  };
}

function createMockPdfDocument() {
  const handlers = {};
  const mockDoc = {
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    y: 100,
    page: { width: 792, height: 612 },
    rect: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
      return mockDoc;
    }),
    end: jest.fn(() => {
      if (handlers.data) {
        handlers.data(Buffer.from('pdf-data'));
      }

      if (handlers.end) {
        handlers.end();
      }
    })
  };

  return mockDoc;
}

describe('Operations Daily Exporter', () => {
  const mockReport = {
    report_date: '2024-01-15',
    operations_name: 'John Doe',
    properties_added: 5,
    preparing_daily_report: 1,
    phone_calls_duty_time: 2,
    replying_to_msg_on_sm_duty_time: 3,
    cvs: 4,
    amending_previous_properties: 6,
    filling: 7,
    preparing_contract: 8,
    tasks_efficiency: -1,
    phone_calls_out_of_duty_time: 9,
    replying_to_msg_on_sm_out_of_duty_time: 10,
    replying_to_whats_up_msg_out_of_duty_time: 11,
    leads_responded_to: 12,
    leads_responded_out_of_duty_time: 2,
    tasks_efficiency_duty_time: 8,
    tasks_efficiency_uniform: 7,
    tasks_efficiency_after_duty: 6
  };

  describe('exportOperationsDailyToExcel', () => {
    it('writes the workbook-style daily sheet and headers', async () => {
      const mockWorksheet = createMockWorksheet();
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      const result = await operationsDailyExporter.exportOperationsDailyToExcel(mockReport);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('JAN');
      expect(mockWorksheet.columns).toHaveLength(14);
      expect(mockWorksheet.cells.get('2:1').value).toBe(15);
      expect(mockWorksheet.cells.get('3:2').value).toBe('Admin and Operations');
      expect(mockWorksheet.cells.get('3:3').value).toBe('New Data');
      expect(mockWorksheet.cells.get('4:2').value).toBe('John Doe');
      expect(mockWorksheet.cells.get('4:3').value).toBe(5);
      expect(mockWorksheet.cells.get('4:11').value).toBe(-1);
      expect(mockWorksheet.cells.get('4:11').font.color.argb).toBe('FFFF0000');
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('supports exporting multiple report rows when given an array', async () => {
      const mockWorksheet = createMockWorksheet();
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      await operationsDailyExporter.exportOperationsDailyToExcel([
        mockReport,
        { ...mockReport, operations_name: 'Jane Doe' }
      ]);

      expect(mockWorksheet.cells.get('4:2').value).toBe('John Doe');
      expect(mockWorksheet.cells.get('5:2').value).toBe('Jane Doe');
    });

    it('uses stored operations rows when a single combined report is exported', async () => {
      const mockWorksheet = createMockWorksheet();
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data'))
        }
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

      await operationsDailyExporter.exportOperationsDailyToExcel({
        ...mockReport,
        operations_name: 'John Doe + Jane Doe',
        operations_rows: [
          { ...mockReport, operations_name: 'John Doe' },
          { ...mockReport, operations_name: 'Jane Doe' }
        ]
      });

      expect(mockWorksheet.cells.get('4:2').value).toBe('John Doe');
      expect(mockWorksheet.cells.get('5:2').value).toBe('Jane Doe');
    });
  });

  describe('exportOperationsDailyToPDF', () => {
    it('renders workbook and legacy sections into the PDF export', async () => {
      const mockDoc = createMockPdfDocument();
      PDFDocument.mockImplementation(() => mockDoc);

      const result = await operationsDailyExporter.exportOperationsDailyToPDF(mockReport);

      expect(PDFDocument).toHaveBeenCalledWith({ margin: 40, size: 'LETTER', layout: 'landscape' });
      expect(mockDoc.text.mock.calls.some((call) => call[0] === 'Workbook Daily Fields')).toBe(true);
      expect(mockDoc.text.mock.calls.some((call) => call[0] === 'Legacy Internal Fields')).toBe(true);
      expect(mockDoc.end).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
