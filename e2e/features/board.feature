Feature: Kanban Board and Cards (Feature 004 — runtime)
  As a Solution Architect
  I want to create cards and move them through the workflow
  And the system enforces allowed transitions

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Board Org" exists and is active
    And a default board flow is provisioned for that organization

  Scenario: Creating a card and moving it through the flow
    When I open the board page
    And I create a card titled "Implement login" of type "Task" in column "TODO"
    Then the card appears in the "TODO" column
    When I open that card
    And I transition it to "In Progress"
    Then the card appears in the "In Progress" column

  Scenario: Disallowed transitions are rejected
    Given a card "Wire payment" of type "Task" exists in column "TODO"
    When I open that card
    And I attempt to transition it directly to "Done"
    Then the transition is rejected with an error
    And the card is still in column "TODO"

  Scenario: Editing a custom field value persists
    Given a card type "Task" has a custom field "github_pr_link" of type "link"
    And a card "Add CI" of type "Task" exists in column "TODO"
    When I open that card
    And I set the field "github_pr_link" to "https://github.com/example/pr/1"
    And I close and reopen the card
    Then the field "github_pr_link" shows "https://github.com/example/pr/1"

  Scenario: Posting and replying to a comment
    Given a card "Refactor router" of type "Task" exists in column "TODO"
    When I open that card
    And I post the comment "First pass review"
    And I reply to that comment with "Pushed an update"
    Then the card shows the comment with one reply
