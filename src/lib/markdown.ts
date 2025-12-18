import type { JSONContent } from "@tiptap/core";

/**
 * Apply markdown marks (bold, italic, code, etc.) to text
 * Adapts to Tiptap JSON structure where mark.type is a string
 */
export function applyMarks(text: string, marks: NonNullable<JSONContent["marks"]>): string {
    let result = text;

    for (const mark of marks) {
        const type = mark.type;

        if (type === "bold") {
            result = `**${result}**`;
        } else if (type === "italic") {
            result = `*${result}*`;
        } else if (type === "code") {
            result = `\`${result}\``;
        } else if (type === "strike") {
            result = `~~${result}~~`;
        } else if (type === "link") {
            const href = mark.attrs?.href || "";
            result = `[${result}](${href})`;
        }
    }

    return result;
}

/**
 * Convert individual node to markdown
 * Expects Tiptap JSON node structure
 */
export function nodeToMarkdown(node: JSONContent): string {
    const { type, attrs, content, text } = node;

    // Handle different node types
    if (type === "heading") {
        const level = "#".repeat(attrs?.level || 1);
        // Assuming heading content is text nodes
        const headingText = content?.map(child => nodeToMarkdown(child)).join("") || "";
        return `${level} ${headingText}`;
    }

    if (type === "paragraph") {
        let paragraphText = "";
        if (content) {
            content.forEach((child) => {
                if (child.type === "text") {
                    paragraphText += applyMarks(child.text || "", child.marks || []);
                } else {
                    paragraphText += nodeToMarkdown(child);
                }
            });
        }
        return paragraphText;
    }

    if (type === "text") {
        return applyMarks(text || "", node.marks || []);
    }

    if (type === "bulletList") {
        let listMarkdown = "";
        if (content) {
            content.forEach((listItem) => {
                listMarkdown += `- ${nodeToMarkdown(listItem).trim()}\n`;
            });
        }
        return listMarkdown.trim();
    }

    if (type === "orderedList") {
        let listMarkdown = "";
        let index = 1;
        if (content) {
            content.forEach((listItem) => {
                listMarkdown += `${index}. ${nodeToMarkdown(listItem).trim()}\n`;
                index++;
            });
        }
        return listMarkdown.trim();
    }

    if (type === "listItem") {
        // List items usually contain paragraphs. We want the content of the paragraph.
        // If it has multiple paragraphs, we might need to handle that, 
        // but for simple markdown lists, usually just the first paragraph's content.
        if (content) {
            return content.map(child => nodeToMarkdown(child)).join("\n");
        }
        return "";
    }

    if (type === "blockquote") {
        const blockquoteContent = content?.map(child => nodeToMarkdown(child)).join("\n> ") || "";
        return `> ${blockquoteContent}`;
    }

    if (type === "codeBlock") {
        const lang = attrs?.language || "";
        const codeContent = content?.map(child => child.text || "").join("") || "";
        return `\`\`\`${lang}\n${codeContent}\n\`\`\``;
    }

    if (type === "hardBreak") {
        return "\n";
    }

    // Default: recurse or return empty
    if (content) {
        return content.map(child => nodeToMarkdown(child)).join("");
    }

    return "";
}

/**
 * Convert Tiptap JSON content (string or object) to Markdown
 */
export function convertTiptapToMarkdown(content: string | object): string {
    try {
        let doc: JSONContent;
        if (typeof content === "string") {
            // Handle potentially empty or invalid JSON
            if (!content.trim()) return "";
            try {
                doc = JSON.parse(content);
            } catch (e) {
                return content; // Return raw string if parse fails (fallback)
            }
        } else {
            doc = content as JSONContent;
        }

        if (!doc.content || !Array.isArray(doc.content)) {
            return "";
        }

        let markdown = "";
        doc.content.forEach((node, index) => {
            markdown += nodeToMarkdown(node);

            // Add spacing between blocks
            if (doc.content && index < doc.content.length - 1) {
                markdown += "\n\n";
            }
        });

        return markdown.trim();
    } catch (error) {
        console.error("Error converting Tiptap to Markdown:", error);
        // Return original string representation as fallback
        return typeof content === "string" ? content : JSON.stringify(content);
    }
}
