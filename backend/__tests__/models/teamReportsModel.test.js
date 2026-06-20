const pool = require('../../config/db')

jest.mock('../../config/db')
jest.mock('../../models/userModel', () => ({
  getTeamLeaderAgents: jest.fn()
}))
jest.mock('../../models/reportsModel', () => ({
  calculateReportData: jest.fn()
}))

const User = require('../../models/userModel')
const Report = require('../../models/reportsModel')
const TeamReports = require('../../models/teamReportsModel')

describe('Team Reports Model', () => {
  beforeEach(() => {
    pool.query = jest.fn()
    jest.clearAllMocks()
  })

  describe('createTeamMonthlyReport', () => {
    it('creates a team report with saved agent snapshots and summary totals', async () => {
      User.getTeamLeaderAgents.mockResolvedValue([
        { id: 11, name: 'Agent One', user_code: 'A1', role: 'agent' }
      ])
      Report.calculateReportData.mockResolvedValue({
        listings_count: 3,
        lead_sources: { Website: 2 },
        viewings_count: 4,
        sales_count: 1,
        sales_amount: 200000,
        agent_commission: 0,
        finders_commission: 0,
        team_leader_commission: 0,
        administration_commission: 0,
        total_commission: 0,
        referral_received_count: 2,
        referral_received_commission: 0,
        referrals_on_properties_count: 1,
        referrals_on_properties_commission: 0
      })

      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 7, name: 'Leader One', user_code: 'TL1', role: 'team leader' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 42 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 42,
            team_leader_id: 7,
            team_leader_name: 'Leader One',
            team_leader_code: 'TL1',
            team_leader_role: 'team leader',
            month: 1,
            year: 2024,
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            agent_count: 1,
            listings_count: 3,
            lead_sources: JSON.stringify({ Website: 2 }),
            viewings_count: 4,
            boosts: '0',
            sales_count: 1,
            sales_amount: '200000',
            agent_commission: '0',
            finders_commission: '0',
            referral_commission: '0',
            team_leader_commission: '0',
            administration_commission: '0',
            total_commission: '0',
            referral_received_count: 2,
            referral_received_commission: '0',
            referrals_on_properties_count: 1,
            referrals_on_properties_commission: '0',
            agent_reports: JSON.stringify([
              {
                agent_id: 11,
                agent_name: 'Agent One',
                agent_code: 'A1',
                agent_role: 'agent',
                start_date: '2024-01-01',
                end_date: '2024-01-31',
                listings_count: 3,
                lead_sources: { Website: 2 },
                viewings_count: 4,
                sales_count: 1,
                sales_amount: 200000,
                referral_received_count: 2,
                referrals_on_properties_count: 1
              }
            ])
          }]
        })

      const result = await TeamReports.createTeamMonthlyReport(
        {
          team_leader_id: 7,
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        99
      )

      expect(User.getTeamLeaderAgents).toHaveBeenCalledWith(7)
      expect(Report.calculateReportData).toHaveBeenCalledWith(
        11,
        expect.any(Date),
        expect.any(Date)
      )
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO team_monthly_reports'),
        expect.any(Array)
      )
      expect(result).toMatchObject({
        id: 42,
        team_leader_id: 7,
        agent_count: 1,
        listings_count: 3,
        lead_sources: { Website: 2 },
        agent_reports: [
          expect.objectContaining({
            agent_id: 11,
            agent_name: 'Agent One'
          })
        ]
      })
    })
  })

  describe('getAllTeamMonthlyReports', () => {
    it('returns parsed team report rows', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          team_leader_id: 7,
          team_leader_name: 'Leader One',
          lead_sources: JSON.stringify({ Website: 4 }),
          agent_reports: JSON.stringify([
            { agent_id: 11, agent_name: 'Agent One', listings_count: 3 }
          ])
        }]
      })

      const result = await TeamReports.getAllTeamMonthlyReports({
        team_leader_id: 7,
        start_date: '2024-01-01'
      })

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('r.team_leader_id = $1'),
        expect.arrayContaining([7, '2024-01-01'])
      )
      expect(result[0]).toMatchObject({
        lead_sources: { Website: 4 },
        agent_reports: [
          expect.objectContaining({
            agent_id: 11,
            agent_name: 'Agent One'
          })
        ]
      })
    })
  })
})
