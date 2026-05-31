Feature: Preset Fields (board-flow blueprint reuse)
  As a Solution Architect
  I want to define preset custom fields once and apply them to multiple card types
  So that boards stay consistent and onboarding stays fast

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Preset Org" exists and is active
    And a default board flow is provisioned for that organization

  Scenario: Default preset fields are seeded on bootstrap
    When I list the preset fields
    Then the preset list includes "github_pr_link"
    And the preset list includes "required_mcp"
    And the preset list includes "prompts"

  Scenario: Create, update, and delete a preset field
    When I create a preset field "tldr" labeled "TL;DR" of type "textarea"
    Then the preset list includes "tldr"
    When I update the "tldr" preset label to "Summary"
    Then the "tldr" preset has label "Summary"
    When I delete the "tldr" preset field
    Then the preset list does not include "tldr"

  Scenario: Reordering presets persists their order
    Given a preset field "alpha" of type "text" exists
    And a preset field "beta" of type "text" exists
    When I reorder presets so "beta" comes before "alpha"
    Then "beta" appears before "alpha" in the preset list

  Scenario: Toggling a preset onto a card type adds the field
    Given a card type "Task" exists in the active organization
    When I toggle the "github_pr_link" preset onto "Task"
    Then the card type "Task" has a custom field "github_pr_link"
    And that custom field is marked as preset-derived
    When I toggle the "github_pr_link" preset off "Task"
    Then the card type "Task" does not have a custom field "github_pr_link"
