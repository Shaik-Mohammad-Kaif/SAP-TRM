import React, { useState } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';

function CodeBlock({ content, blockKey }) {
    const [copied, setCopied] = useState(false);

    const lines = content.split('\n');
    const firstLine = lines[0].trim().toLowerCase();

    const languages = ['java', 'javascript', 'python', 'cpp', 'c', 'html', 'css', 'sql', 'ruby', 'go', 'rust', 'php', 'typescript', 'jsx', 'tsx'];
    const isLanguage = languages.includes(firstLine) && lines.length > 1;

    const language = isLanguage ? firstLine : '';
    const codeContent = isLanguage ? lines.slice(1).join('\n') : content;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(codeContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="code-block-wrapper">
            {language && (
                <div className="code-language-label">
                    {language}
                </div>
            )}
            <pre className="code-block">
                <code>{codeContent}</code>
                <button
                    onClick={handleCopy}
                    className={`code-copy-btn ${copied ? 'copied' : ''}`}
                    title={copied ? 'Copied!' : 'Copy code'}
                >
                    {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </pre>
        </div>
    );
}

export function SimpleFormattedText({ text }) {
    if (!text) return null;

    const codeBlockRegex = /```([^`]+)```/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }
        segments.push({
            type: 'codeblock',
            content: match[1].trim()
        });
        lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }

    return (
        <>
            {segments.map((segment, segIdx) => {
                if (segment.type === 'codeblock') {
                    return <CodeBlock key={`cb-${segIdx}`} content={segment.content} />;
                }

                let cleanText = segment.content;

                cleanText = cleanText.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
                cleanText = cleanText.replace(/^#{1,6}\s+/gm, '');
                cleanText = cleanText.replace(/^>\s*/gm, '');
                cleanText = cleanText.replace(/^[•\-*]\s+/gm, '');
                cleanText = cleanText.replace(/^[-*]{3,}$/gm, '');
                cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1');
                cleanText = cleanText.replace(/`([^`]+)`/g, '$1');

                const lines = cleanText.split('\n');

                return (
                    <React.Fragment key={`seg-${segIdx}`}>
                        {lines.map((line, lIdx) => {
                            const trimmed = line.trim();

                            if (!trimmed) {
                                return <div key={lIdx} style={{ height: '0.5em' }} />;
                            }

                            return (
                                <div key={lIdx} style={{ marginBottom: '0.5em' }}>
                                    {line}
                                </div>
                            );
                        })}
                    </React.Fragment>
                );
            })}
        </>
    );
}

function processInlineMarkdown(text) {
    const parts = [];
    let currentText = text;
    let key = 0;

    const codeRegex = /`([^`]+)`/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        segments.push({ type: 'code', content: match[1] });
        lastIndex = codeRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return segments.map((segment, idx) => {
        if (segment.type === 'code') {
            return <code key={`code-${idx}`}>{segment.content}</code>;
        }

        const boldRegex = /\*\*([^*]+)\*\*/g;
        const boldParts = [];
        let bLastIndex = 0;
        let bMatch;

        while ((bMatch = boldRegex.exec(segment.content)) !== null) {
            if (bMatch.index > bLastIndex) {
                boldParts.push(segment.content.slice(bLastIndex, bMatch.index));
            }
            boldParts.push(<strong key={`b-${idx}-${bMatch.index}`}>{bMatch[1]}</strong>);
            bLastIndex = boldRegex.lastIndex;
        }

        if (bLastIndex < segment.content.length) {
            boldParts.push(segment.content.slice(bLastIndex));
        }

        return <React.Fragment key={`seg-${idx}`}>{boldParts.length > 0 ? boldParts : segment.content}</React.Fragment>;
    });
}

function FormattedText({ text }) {
    if (!text) return null;

    const codeBlockRegex = /```([^`]+)```/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }
        segments.push({
            type: 'codeblock',
            content: match[1].trim()
        });
        lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }

    return (
        <>
            {segments.map((segment, segIdx) => {
                if (segment.type === 'codeblock') {
                    return <CodeBlock key={`cb-${segIdx}`} content={segment.content} />;
                }

                const lines = segment.content.split('\n');
                const elements = [];
                let i = 0;

                while (i < lines.length) {
                    const line = lines[i];
                    const trimmed = line.trim();

                    if (!trimmed) {
                        i++;
                        continue;
                    }

                    if (trimmed.startsWith('###')) {
                        const content = trimmed.slice(3).trim();
                        elements.push(<h3 key={`h3-${i}`}>{processInlineMarkdown(content)}</h3>);
                        i++;
                        continue;
                    }

                    if (trimmed.startsWith('##')) {
                        const content = trimmed.slice(2).trim();
                        elements.push(<h2 key={`h2-${i}`}>{processInlineMarkdown(content)}</h2>);
                        i++;
                        continue;
                    }

                    if (trimmed === '---' || trimmed === '***') {
                        elements.push(<hr key={`hr-${i}`} />);
                        i++;
                        continue;
                    }

                    if (trimmed.startsWith('>')) {
                        const content = trimmed.slice(1).trim();
                        elements.push(
                            <blockquote key={`bq-${i}`}>
                                <p>{processInlineMarkdown(content)}</p>
                            </blockquote>
                        );
                        i++;
                        continue;
                    }

                    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                        const listItems = [];
                        while (i < lines.length) {
                            const listLine = lines[i].trim();
                            if (listLine.startsWith('•') || listLine.startsWith('-') || listLine.startsWith('*')) {
                                const content = listLine.slice(1).trim();
                                listItems.push(<li key={`li-${i}`}>{processInlineMarkdown(content)}</li>);
                                i++;
                            } else if (!listLine) {
                                i++;
                                break;
                            } else {
                                break;
                            }
                        }
                        if (listItems.length > 0) {
                            elements.push(<ul key={`ul-${i}`}>{listItems}</ul>);
                        }
                        continue;
                    }

                    elements.push(<p key={`p-${i}`}>{processInlineMarkdown(line)}</p>);
                    i++;
                }

                return <React.Fragment key={`seg-${segIdx}`}>{elements}</React.Fragment>;
            })}
        </>
    );
}

export default FormattedText;
