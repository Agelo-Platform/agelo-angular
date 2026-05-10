Feature: Organization Management (Feature 007)
  As a Solution Architect
  I want to manage organizations
  So that I can isolate boards, teams and cards per project

  Background:
    Given I am signed in as the Solution Architect

  Scenario: Creating, renaming, and deleting an organization
    When I open the organizations page
    And I create an organization titled "Acme E2E" with color "#4a6cf7"
    Then "Acme E2E" appears in the organizations list
    When I rename "Acme E2E" to "Acme Renamed"
    Then "Acme Renamed" appears in the organizations list
    When I delete the organization "Acme Renamed"
    Then "Acme Renamed" is no longer in the organizations list

  Scenario: Duplicate organization titles are rejected
    Given an organization "Globex" exists
    When I try to create another organization titled "Globex"
    Then I see an organization creation error
