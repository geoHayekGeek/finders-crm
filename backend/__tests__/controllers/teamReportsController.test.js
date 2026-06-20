const TeamReport = require('../../models/teamReportsModel')

jest.mock('../../models/teamReportsModel', () => ({
  createTeamMonthlyReport: jest.fn(),
  getAllTeamMonthlyReports: jest.fn(),
  getTeamMonthlyReportById: jest.fn(),
  deleteTeamMonthlyReport: jest.fn()
}))
jest.mock('../../utils/teamReportExporter', () => ({
  exportTeamReportToExcel: jest.fn()
}))

const TeamReportsController = require('../../controllers/teamReportsController')

describe('Team Reports Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('forces team leaders to view only their own team reports', async () => {
    TeamReport.getAllTeamMonthlyReports.mockResolvedValue([])

    const req = {
      user: { role: 'team leader', id: 7 },
      query: { team_leader_id: '99', start_date: '2024-01-01' }
    }
    const res = {
      json: jest.fn()
    }

    await TeamReportsController.getAllTeamMonthlyReports(req, res)

    expect(TeamReport.getAllTeamMonthlyReports).toHaveBeenCalledWith({
      team_leader_id: 7,
      start_date: '2024-01-01'
    })
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: []
    }))
  })
})
