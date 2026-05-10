Feature: MCP Server API Contract (Feature 009)
  As the MCP server
  I need the backend endpoints I depend on to behave per spec
  So that agents can read onboarding, register, poll status, and read permissions

  Background:
    Given the bootstrap SA has signed in
    And an organization "MCP Org" exists
    And a team "agents-team" exists in "MCP Org"
    And an API key exists for "MCP Org"

  Scenario: Reading team onboarding via the API key
    When the MCP fetches onboarding for the "agents-team" team
    Then the response contains the team's name and onboarding markdown content

  Scenario: Registering an agent and polling for approval
    When the MCP registers an agent "agent-mcp-1" titled "Claude One" on "agents-team"
    Then the registration response is created with status "pending"
    When the MCP polls the status of "agent-mcp-1"
    Then the polled status is "pending"
    When the SA approves the agent "agent-mcp-1"
    And the MCP polls the status of "agent-mcp-1"
    Then the polled status is "approved"

  Scenario: Reading agent permissions reflects platform-wide grants
    Given an approved agent "agent-mcp-2" exists on "agents-team"
    When the MCP fetches permissions for "agent-mcp-2"
    Then the permissions list includes "board.read"
    And the response includes per-card-type and per-column access flags

  Scenario: Card writes are gated by card-type and column flags
    Given a default board flow is provisioned for "MCP Org"
    And a column "Locked" with agent moderation disabled exists
    And a card type "Locked Type" with agent pickup disabled exists
    And a card "BlockedCard" of type "Task" exists in column "TODO"
    When the MCP attempts to update "BlockedCard" with new field values
    Then the update is gated based on card type and column flags
