Feature: MCP Server Registry (Feature 015)
  As a Solution Architect
  I want to manage the MCP server registry
  So that the SPA's catalog and agents can pick integrations

  Background:
    Given I am signed in as the Solution Architect

  Scenario: Creating a new MCP server and listing it
    When I create an MCP server titled "Filesystem MCP" with regular config "{\"cmd\":\"node\"}" and docker config "{\"image\":\"fs-mcp\"}"
    Then the MCP server "Filesystem MCP" appears in the registry list
    And the regularConfig defaults to a JSON object string

  Scenario: Duplicate MCP titles are rejected with 409
    Given an MCP server titled "Postgres MCP" exists
    When I attempt to create another MCP server titled "Postgres MCP"
    Then the MCP create call fails with status 409

  Scenario: Invalid JSON in regularConfig returns 409
    When I attempt to create an MCP server titled "BrokenConfig MCP" with regular config "{not-json}"
    Then the MCP create call fails with status 409

  Scenario: Updating title and configs persists
    Given an MCP server titled "Slack MCP" exists
    When I update that MCP server with title "Slack MCP v2" and regular config "{\"channels\":[]}"
    Then the MCP server "Slack MCP v2" appears in the registry list
    And the MCP server's regularConfig equals "{\"channels\":[]}"

  Scenario: Archive then permanently delete an MCP server
    Given an MCP server titled "Sandbox MCP" exists
    When I archive that MCP server
    Then the MCP server "Sandbox MCP" is no longer in the registry list
    When I permanently delete the archived MCP server "Sandbox MCP"
    Then the archived MCP server "Sandbox MCP" no longer exists
