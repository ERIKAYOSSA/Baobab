import { Session } from "neo4j-driver";
import { listPendingForApprover } from "./familyApproval";

export async function getNotifications(session: Session, personId: string) {
  const pendingApprovals = await listPendingForApprover(session, personId);

  const myRequests = await session.run(
    `
    MATCH (req:RelationshipRequest {requesterId: $personId})
    OPTIONAL MATCH (approver:Person)-[a:MUST_APPROVE]->(req)
    RETURN req,
      count(CASE WHEN a.status = 'pending' THEN 1 END) AS pendingVotes,
      count(CASE WHEN a.status = 'approved' THEN 1 END) AS approvedVotes,
      count(a) AS totalVotes
    ORDER BY req.createdAt DESC
    LIMIT 20
    `,
    { personId }
  );

  const toNum = (v: unknown) =>
    typeof v === "object" && v !== null && "low" in v ? (v as { low: number }).low : Number(v ?? 0);

  return {
    pendingApprovals: pendingApprovals.map((item) => ({
      type: "approval_required" as const,
      requestId: item.request.id as string,
      requestType: item.request.type as string,
      requester: item.requester,
      createdAt: item.request.createdAt
    })),
    myRequests: myRequests.records.map((record) => {
      const req = record.get("req").properties as Record<string, unknown>;
      return {
        type: "my_request" as const,
        requestId: req.id as string,
        status: req.status as string,
        relationshipType: req.type as string,
        fromPersonId: req.fromPersonId as string,
        toPersonId: req.toPersonId as string,
        pendingVotes: toNum(record.get("pendingVotes")),
        approvedVotes: toNum(record.get("approvedVotes")),
        totalVotes: toNum(record.get("totalVotes")),
        createdAt: req.createdAt
      };
    }),
    summary: {
      pendingApprovalsCount: pendingApprovals.length,
      myPendingRequestsCount: myRequests.records.filter(
        (r) => (r.get("req").properties as Record<string, unknown>).status === "pending"
      ).length
    }
  };
}
