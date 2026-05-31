Feature: Organization Home Analytics (Feature 011)
  As a Solution Architect
  I want a dashboard summarizing each organization's activity

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Analytics Org" exists and is active
    And a default board flow is provisioned for that organization
    And the active organization has 5 cards distributed across columns

  Scenario: Home page shows totals and per-status breakdown
    When I open the home page
    Then the total card count shown is 5
    And the per-column breakdown is rendered as bars
    And the team count and agent count are shown
