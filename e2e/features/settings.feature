Feature: User Settings (Feature 003)
  As an authenticated SA
  I want to manage my account: theme, password, and API keys

  Background:
    Given I am signed in as the Solution Architect

  Scenario: Toggling the theme persists to the user account
    When I open the settings page
    And I toggle the theme
    Then the page is now in dark mode
    When I reload the application
    Then the page is still in dark mode

  Scenario: Changing the password rejects a weak new password
    When I open the settings page
    And I change the password from "Architect#1" to "weakpass"
    Then I see a password error mentioning the strength rules

  Scenario: Changing the password to a strong value succeeds
    When I open the settings page
    And I change the password from "Architect#1" to "Architect#2"
    Then I see a password success message
    And I can sign out and sign back in with the new password
    And I restore the password back to "Architect#1"

  Scenario: Creating, disabling, and revoking an API key
    Given there is at least one organization
    When I open the settings page
    And I create an API key named "agent-test" for the first organization
    Then a raw API key is shown to me exactly once
    And the key appears in the API keys list as active
    When I disable that API key
    Then the key is shown as disabled
    When I revoke that API key
    Then the key no longer appears in the list
