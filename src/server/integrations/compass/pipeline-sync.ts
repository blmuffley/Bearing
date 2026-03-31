/**
 * Sync SOW and assessment data to Compass CRM.
 *
 * Compass is Avennorth's collective CRM/sales platform. When a SOW is
 * generated or an assessment is completed, Bearing pushes relevant data
 * to Compass so the sales pipeline stays current.
 *
 * TODO: The Compass webhook contract is not yet finalized. The current
 * implementation posts to a placeholder endpoint. Once Compass builds
 * its receiver endpoint, update the payload schema and endpoint paths
 * to match the agreed-upon contract.
 *
 * TODO: Add webhook signature verification (HMAC-SHA256) once Compass
 * provides a shared secret.
 *
 * TODO: Add retry logic with exponential backoff for transient failures.
 *
 * TODO: Add idempotency keys to prevent duplicate syncs.
 */

export interface CompassSyncConfig {
  compassUrl: string;
  apiKey: string;
}

interface SyncSowPayload {
  id: string;
  customerName: string;
  status: string;
  engagementType: string;
  totalRevenueLow: number;
  totalRevenueHigh: number;
  assessmentHealthScore: number;
  findingsSummary: Record<string, number>;
}

interface SyncLeadPayload {
  customerName: string;
  instanceUrl: string;
  healthScore: number;
  totalRevenue: number;
  quickWinCount: number;
}

export class CompassPipelineSync {
  constructor(private config: CompassSyncConfig) {}

  /**
   * Sync a SOW to the Compass pipeline as a deal.
   *
   * TODO: Confirm the Compass endpoint path and response schema once
   * the Compass integration receiver is built.
   */
  async syncSow(sow: SyncSowPayload): Promise<{
    success: boolean;
    compassDealId?: string;
    error?: string;
  }> {
    const url = `${this.config.compassUrl}/api/integrations/bearing/sync`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          // TODO: Add X-Bearing-Signature header with HMAC once
          // Compass provides a shared signing secret.
        },
        body: JSON.stringify({
          type: 'sow_sync',
          payload: {
            sowId: sow.id,
            customerName: sow.customerName,
            status: sow.status,
            engagementType: sow.engagementType,
            totalRevenueLow: sow.totalRevenueLow,
            totalRevenueHigh: sow.totalRevenueHigh,
            assessmentHealthScore: sow.assessmentHealthScore,
            findingsSummary: sow.findingsSummary,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `Compass sync failed (${response.status}): ${errorBody}`,
        };
      }

      // TODO: Parse the Compass response to extract the deal ID once
      // the response schema is finalized.
      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      return {
        success: true,
        compassDealId: data.dealId as string | undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: `Compass sync error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Sync an assessment result to Compass as a lead / opportunity.
   *
   * Called after an assessment completes to create or update a lead in
   * the Compass pipeline with the assessment health score and revenue
   * potential.
   *
   * TODO: Confirm the Compass lead endpoint path and response schema.
   */
  async syncAssessmentToLead(params: SyncLeadPayload): Promise<{
    success: boolean;
    compassLeadId?: string;
    error?: string;
  }> {
    const url = `${this.config.compassUrl}/api/integrations/bearing/sync`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          type: 'assessment_lead',
          payload: {
            customerName: params.customerName,
            instanceUrl: params.instanceUrl,
            healthScore: params.healthScore,
            totalRevenue: params.totalRevenue,
            quickWinCount: params.quickWinCount,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `Compass lead sync failed (${response.status}): ${errorBody}`,
        };
      }

      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      return {
        success: true,
        compassLeadId: data.leadId as string | undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: `Compass lead sync error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
