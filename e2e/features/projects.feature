Feature: Projects with Default Kanban (Feature 020)
  As a Solution Architect
  I want to spin up projects bundled with a default Kanban template
  And archive, restore, or permanently delete them

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Projects Org" exists and is active

  Scenario: Creating a project with the default_kanban template provisions columns and Task fields
    When I create a project titled "Kanban Pilot" with template "default_kanban"
    Then the project's columns include the four default Kanban names
    And the project's Task card type carries the 8 default custom fields

  Scenario: Archive then restore a project via the global archive endpoint
    When I create a project titled "Archived Project" with template "default_kanban"
    And I archive that project
    Then that project is not in the active projects list
    When I restore the archived project via the archive endpoint
    Then that project is back in the active projects list

  Scenario: Permanently delete a project
    When I create a project titled "Doomed Project" with template "default_kanban"
    And I permanently delete that project
    Then that project is not in the active projects list
    And no archived project with title "Doomed Project" remains
