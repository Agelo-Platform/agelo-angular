Feature: Board Flow Manager (Feature 004)
  As a Solution Architect
  I want to design card types, custom fields, columns, transitions, and relationships
  So that the workflow matches the project's needs

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Flow Org" exists and is active

  Scenario: Creating card types and custom fields
    When I open the board flow manager
    And I add a card type "Feature"
    And I add a card type "Task"
    Then both card types appear in the card-types panel
    When I add a custom field "github_pr_link" labeled "GitHub PR" of type "link" to "Task"
    Then the field "github_pr_link" appears under "Task"

  Scenario: Toggling card-type flags persists
    Given a card type "Task" exists
    When I open the board flow manager
    And I disable agent pickup on "Task"
    Then the card type "Task" has agent pickup disabled

  Scenario: Adding columns and ordering them
    When I open the board flow manager
    And I switch to the columns tab
    And I add columns "TODO", "In Progress", "Review", "Done" in order
    Then all four columns appear in left-to-right order

  Scenario: Drawing allowed status transitions
    Given columns "TODO", "In Progress", "Review", "Done" exist
    When I open the board flow manager
    And I switch to the transitions tab
    And I draw transitions TODO -> In Progress, In Progress -> Review, Review -> Done
    Then the transition graph shows three edges

  Scenario: Drawing card relationships
    Given card types "Feature" and "Task" exist
    When I open the board flow manager
    And I switch to the relationships tab
    And I draw a relationship from "Feature" to "Task"
    Then the relationships graph shows that edge
