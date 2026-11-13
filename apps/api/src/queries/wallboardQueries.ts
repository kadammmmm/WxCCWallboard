export function taskKpiQuery(from: number, to: number): string {
  return `{
  taskDetails(
    from: ${from}
    to: ${to}
    aggregations: [
      { field: "id", type: count, name: "offered" }
      { field: "id", type: count, name: "answered", filter: { isContactHandled: { equals: true } } }
      { field: "id", type: count, name: "abandoned", filter: { abandonedType: { notequals: null } } }
      { field: "id", type: count, name: "withinSla", filter: { and: [{ isWithInServiceLevel: { equals: true } }, { isContactHandled: { equals: true } }] } }
      { field: "ringingDuration", type: average, name: "asa" }
      { field: "connectedDuration", type: average, name: "aht" }
    ]
  ) {
    tasks {
      aggregation { name value }
    }
  }
}`;
}

export function channelMixQuery(from: number, to: number): string {
  return `{
  taskDetails(
    from: ${from}
    to: ${to}
    aggregations: [{ field: "id", type: count, name: "byChannel" }]
  ) {
    tasks {
      channelType
      channelSubType
      aggregation { name value }
    }
  }
}`;
}

export function queueTotalsQuery(from: number, to: number): string {
  return `{
  taskDetails(
    from: ${from}
    to: ${to}
    aggregations: [
      { field: "id", type: count, name: "offered" }
      { field: "id", type: count, name: "answered", filter: { isContactHandled: { equals: true } } }
      { field: "id", type: count, name: "withinSla", filter: { and: [{ isWithInServiceLevel: { equals: true } }, { isContactHandled: { equals: true } }] } }
    ]
  ) {
    tasks {
      lastQueue { name }
      channelType
      channelSubType
      aggregation { name value }
    }
  }
}`;
}

export function queueStatsQuery(from: number, to: number, cursor?: string): string {
  const pagination = cursor ? `pagination: { cursor: ${JSON.stringify(cursor)} }` : "";
  return `{
  taskDetails(
    from: ${from}
    to: ${to}
    filter: { and: [{ isActive: { equals: true } }, { status: { equals: "parked" } }] }
    ${pagination}
  ) {
    tasks {
      lastQueue { name }
      channelType
      channelSubType
      createdTime
      activities { nodes { eventName createdTime isActive queueName } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
}

export function agentStateQuery(from: number, to: number, cursor?: string): string {
  const pagination = cursor ? `pagination: { cursor: ${JSON.stringify(cursor)} }` : "";
  return `{
  agentSession(
    from: ${from}
    to: ${to}
    filter: { isActive: { equals: true } }
    ${pagination}
  ) {
    agentSessions {
      agentId
      agentName
      teamName
      channelInfo {
        currentState
        channelType
        idleCodeName
        lastActivityTime
        activities { nodes { startTime endTime duration state isCurrentActivity } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
}
