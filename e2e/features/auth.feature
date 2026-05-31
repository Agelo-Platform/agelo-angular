Feature: Authentication (Feature 003)
  As a Solution Architect
  I want to log in with my bootstrap credentials
  So that I can access the platform

  Background:
    Given the Agelo frontend is open

  Scenario: Successful login as the bootstrap Solution Architect
    When I sign in with the bootstrap credentials
    Then I am redirected to the organizations page
    And the user menu shows the SA display name

  Scenario: Failed login with invalid credentials
    When I attempt to sign in as "architect@agelo.local" with password "wrong-password"
    Then I see a sign-in error message

  Scenario: Logout returns me to the login page
    Given I am signed in as the Solution Architect
    When I click "Sign out"
    Then I am back on the login page
