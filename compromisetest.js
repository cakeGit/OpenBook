import nlp from "compromise";

const text = "programming language";

const doc = nlp(text)

console.log(doc.has("#Gerund #noun")); // true