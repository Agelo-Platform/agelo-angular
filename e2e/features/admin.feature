Feature: Admin About and Export (Feature 020)
  As a Solution Architect
  I want product metadata and a downloadable database snapshot
  So that I can audit and back up the workspace

  Background:
    Given I am signed in as the Solution Architect

  Scenario: About endpoint returns the product metadata shape
    When I fetch the admin about payload
    Then the admin about response has product "Agelo"
    And the admin about response carries a non-empty version, tagline, and docs URL

  Scenario: Export downloads as application/json with an attachment filename
    When I fetch the admin export
    Then the admin export Content-Type starts with "application/json"
    And the admin export Content-Disposition contains "attachment"
    And the admin export filename matches "agelo-" followed by a timestamp and ".json"

  Scenario: Export body strips sensitive fields and carries every aggregate
    When I fetch the admin export
    Then the admin export body has the aggregate keys
    And no user in the export carries a passwordHash
    And no api key in the export carries a keyHash
