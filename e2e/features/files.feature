Feature: File Attachments (Feature 016)
  As a Solution Architect
  I want to upload and download files attached to card fields
  So that the team's artefacts live alongside the work

  Background:
    Given I am signed in as the Solution Architect
    And an organization "Files Org" exists and is active
    And a default board flow is provisioned for that organization
    And a card type "Task" has a custom field "attachments" of type "file"

  Scenario: Uploading a small text file then listing it for the field
    Given a card "Spec doc upload" of type "Task" exists in column "TODO"
    When I upload a small text file "notes.txt" to the "attachments" field of that card
    Then the upload succeeds and returns metadata
    And the file is listed for the card's "attachments" field

  Scenario: Downloading the file returns the security headers
    Given a card "Spec doc download" of type "Task" exists in column "TODO"
    And I have uploaded a small text file "spec.txt" to the "attachments" field of that card
    When I download that file
    Then the download status is 200
    And the download Content-Type starts with "text/plain"
    And the download response sets X-Content-Type-Options to "nosniff"
    And the download Content-Security-Policy contains "default-src 'none'"

  Scenario: Disallowed MIME type is rejected
    Given a card "Spec doc badmime" of type "Task" exists in column "TODO"
    When I attempt to upload a file with content type "application/x-shellscript" to the "attachments" field
    Then the file upload fails with status 400

  Scenario: Uploading to a non-file field is rejected
    Given a card type "Task" has a custom field "github_pr_link" of type "link"
    And a card "Spec doc wrongfield" of type "Task" exists in column "TODO"
    When I attempt to upload a small text file "wrong.txt" to the "github_pr_link" field of that card
    Then the file upload fails with status 400

  Scenario: Deleting a file removes it from the field listing
    Given a card "Spec doc delete" of type "Task" exists in column "TODO"
    And I have uploaded a small text file "deleteme.txt" to the "attachments" field of that card
    When I delete that uploaded file
    Then the file is no longer listed for the card's "attachments" field
