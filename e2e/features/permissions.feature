Feature: Roles and Permissions (Feature 005)
  As a Solution Architect
  I want to grant or revoke agent platform-wide permissions

  Background:
    Given I am signed in as the Solution Architect

  Scenario: All five default permissions are seeded for the agent role
    When I open the roles and permissions page
    Then I see the permission "board.read"
    And I see the permission "board.card.update"
    And I see the permission "board.card.comment"
    And I see the permission "team.read"
    And I see the permission "prompt.read"

  Scenario: Toggling a permission updates the agent role
    When I open the roles and permissions page
    And I revoke the permission "board.card.comment"
    Then the API reports "board.card.comment" as not granted to the agent role
    When I grant the permission "board.card.comment"
    Then the API reports "board.card.comment" as granted to the agent role
