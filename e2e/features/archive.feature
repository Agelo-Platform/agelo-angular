Feature: Cross-aggregate Archive (Feature 019)
  As a Solution Architect
  I want a single feed of every archived row across the workspace
  So that I can restore or hard-delete soft-removed items

  Background:
    Given I am signed in as the Solution Architect

  Scenario: Archiving an organization shows it in the global archive list
    Given an organization "Archive Org A" exists and is active
    When I archive that organization
    Then the archive feed contains an item titled "Archive Org A" of type "organization"

  Scenario: Restoring an archived team brings it back to the active list
    Given an organization "Archive Org B" exists and is active
    And a team "Squad-A" exists in the active organization
    When I archive that team
    And I restore the archived team
    Then the team "Squad-A" is active again in the active organization

  Scenario: Hard-deleting an archived prompt removes it from the archive
    Given a prompt "Throwaway Prompt" exists
    When I archive that prompt
    And I hard-delete the archived prompt
    Then the archive feed does not contain "Throwaway Prompt"

  Scenario: Search filters by title (case-insensitive substring)
    Given an organization "Search Target Alpha" exists and is active
    And an organization "Other Org Beta" exists and is active
    When I archive each of those organizations
    And I list the archive with search "alpha"
    Then the archive feed contains an item titled "Search Target Alpha" of type "organization"
    And the archive feed does not contain "Other Org Beta"

  Scenario: Pagination respects offset and limit
    When I list the archive with offset 0 and limit 1
    Then the archive feed limit is 1 and offset is 0
