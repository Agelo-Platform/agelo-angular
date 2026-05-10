Feature: Card Relationships, History, and Restore (Feature 004 — relationships)
  As a Solution Architect
  I want parent-child constraints, an audit trail, and undo on archive
  So that the workflow stays coherent and reversible

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Rel Org" exists and is active
    And a default board flow is provisioned for that organization

  Scenario: Parent card type gates child creation
    Given a card type "Feature" exists in the active organization
    And a parent-child relationship from "Feature" to "Task" is registered
    And a card "Auth feature" of type "Feature" exists in column "TODO"
    When I create a child card "Wire login" of type "Task" with that "Feature" card as parent
    Then the child card is created successfully
    When I attempt to create a child card "Bad parent type" of type "Task" with a "Task" card as parent
    Then the child card creation fails with status 400

  Scenario: Card history records title and assigned-agent updates
    Given a team "Audit" exists in the active organization
    And an API key exists for the active organization
    And an approved agent "agent-history-1" titled "Auditor" is registered to "Audit"
    And a card "Triage queue" of type "Task" exists in column "TODO"
    When I patch the card title to "Triage queue v2"
    And I patch the card's assigned agent to "agent-history-1"
    Then the card history has at least 2 rows
    And the card history records a "title" change
    And the card history records an "assignedAgent" change

  Scenario: Archiving and restoring a card
    Given a card "Tossed away" of type "Task" exists in column "TODO"
    When I archive that card
    Then that card is no longer listed in the org cards feed
    When I restore that archived card
    Then that card is listed in the org cards feed
