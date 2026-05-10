Feature: Prompt Library (Feature 006)
  As a Solution Architect
  I want a versioned, categorized library of reusable prompts

  Background:
    Given I am signed in as the Solution Architect

  Scenario: Creating a category and a prompt with initial version
    When I open the prompt library
    And I create a category "Architecture"
    Then "Architecture" appears in the category list
    When I create a prompt titled "API Design Reviewer" in category "Architecture"
    Then the prompt "API Design Reviewer" exists with one version

  Scenario: Saving a new version vs replacing the current version
    Given a prompt "API Design Reviewer" exists with version "1.0.0"
    When I open the prompt "API Design Reviewer"
    And I edit the body to "# v1.1 body"
    And I save it as a new version "1.1.0"
    Then the prompt has versions "1.0.0" and "1.1.0"
    When I switch to version "1.0.0"
    And I edit the body to "# replaced body"
    And I replace the current version
    Then version "1.0.0" content equals "# replaced body"

  Scenario: Deleting a prompt
    Given a prompt "Disposable" exists
    When I open the prompt "Disposable"
    And I delete the prompt
    Then "Disposable" is no longer in the prompt list
