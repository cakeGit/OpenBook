import { Validator } from "./validator.js";

export const ALL_FIELDS_PRESENT = new Validator().whereAllFields((v) =>
    v.notNull(),
);

export const VALID_PAGE_NAME = new Validator("Page Name")
    .notNull()
    .lengthBetween(1, 50)
    .hasNameLikeCharsOnly();

export const VALID_RECENT_LAST_EDITED_TIMESTAMP = new Validator("Last Edited Time")
    .notNull()
    .instanceOf("number")