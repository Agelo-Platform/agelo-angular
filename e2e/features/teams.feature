Feature: Teams and Agent Onboarding (Features 008, 010)
  As a Solution Architect
  I want to create teams, edit onboarding docs, and manage agent registrations

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Teams Org" exists and is active

  Scenario: Creating a team and editing its onboarding markdown
    When I open the teams page
    And I create a team named "backend"
    Then "backend" appears in the teams list
    When I open the "backend" team
    And I edit the onboarding doc to "# Backend onboarding\nFollow the conventions."
    And I save the onboarding doc
    Then the live preview shows a heading "Backend onboarding"
    And the onboarding doc fetched from the API equals the saved content

  Scenario: Agent registration through the public API and SA approval
    Given a team "devops" exists in the active organization
    And an API key exists for the active organization
    When the agent registers via the API as "agent-e2e-1" titled "Claude DevOps"
    Then the agent status is "pending"
    When I open the "devops" team in the UI
    And I approve the agent "agent-e2e-1"
    Then the agent status becomes "approved"
    When I stop the agent "agent-e2e-1"
    Then the agent status becomes "stopped"
    When I delete the agent "agent-e2e-1"
    Then the agent "agent-e2e-1" no longer appears in the team
