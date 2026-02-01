-- Users
CREATE TABLE IF NOT EXISTS Users (
    UserID BLOB PRIMARY KEY,
    LabelName TEXT NOT NULL, --Little "tag" name. e.g "Samuel" -> "samuel"
    DisplayName TEXT NOT NULL,
    Email TEXT NOT NULL,
    GoogleUserID TEXT, --May be NULL if the user deleted their account
    ProfilePictureURL TEXT, --Similarly may be NULL
    Deleted INTEGER NOT NULL DEFAULT 0 --SQLite has no BOOL, so integers are used with 0 = active, 1 = deleted
);

-- Notebook
CREATE TABLE IF NOT EXISTS Notebooks (
    NotebookID BLOB PRIMARY KEY,
    Name TEXT NOT NULL,
    OwnerUserID BLOB NOT NULL
);

-- Pages
CREATE TABLE IF NOT EXISTS Pages (
    PageID BLOB PRIMARY KEY,
    Name TEXT NOT NULL,
    NotebookID BLOB NOT NULL,
    FileTreeParentID BLOB, --NULL means root of notebook
    OrderIndex INTEGER, --Order within the parent
    LastEditedTime INTEGER,
    LastEditedUserID BLOB
);

-- Auth keys for a user
CREATE TABLE IF NOT EXISTS UserLogins (
    UserID BLOB NOT NULL,
    AuthKey BLOB NOT NULL PRIMARY KEY,
    DeviceInfo TEXT
);

-- Blocks
CREATE TABLE IF NOT EXISTS Blocks (
    BlockID BLOB PRIMARY KEY,
    ParentBlockID BLOB,
    OrderIndex INTEGER NOT NULL,
    Type TEXT NOT NULL,
    PageID BLOB
);

-- Flashcard learning history
CREATE TABLE IF NOT EXISTS FlashcardLearningHistory (
    OwnerUserID BLOB NOT NULL,
    FlashcardLinkID BLOB NOT NULL,
    LearningHistory INTEGER,
    LastLearnedTime INTEGER,

    PRIMARY KEY (OwnerUserID, FlashcardLinkID) --Composite primary key
);

-- Text block (more blocks to come)
CREATE TABLE IF NOT EXISTS TextBlocks (
    BlockID BLOB PRIMARY KEY,
    TextContent TEXT,
    Subtype TEXT --Null means normal, but could be "header"
);

CREATE TABLE IF NOT EXISTS FlashcardBlocks (
    BlockID BLOB PRIMARY KEY,
    FrontText TEXT,
    BackText TEXT,
    FrontCanvasDocumentData BLOB,
    BackCanvasDocumentData BLOB,
    FlashcardLinkID BLOB --Link to the flashcard in the learning history table
);

CREATE TABLE IF NOT EXISTS DrawingCanvasBlocks (
    BlockID BLOB PRIMARY KEY,
    DocumentData BLOB
);

--Blocks are accessed by page id, and since page id is not a primary key, its slow otherwise
CREATE INDEX IF NOT EXISTS index_blocks_by_pageid ON Blocks (PageID);