import React from "react";
import { FiBook, FiAlertTriangle, FiSettings } from "react-icons/fi";
import FormattedText from "./FormattedText";
import "../styles/runbook.css";

export default function RunbookCard({ content, type, sources }) {
    const getRunbookConfig = () => {
        switch (type) {
            case 'operational':
                return {
                    title: "Operational Procedures",
                    icon: <FiBook />,
                    gradient: "linear-gradient(135deg, #2d817a 0%, #3b9d94 100%)",
                    badgeColor: "#2d817a",
                    borderColor: "#2d817a"
                };
            case 'incident':
                return {
                    title: "Incident Response",
                    icon: <FiAlertTriangle />,
                    gradient: "linear-gradient(135deg, #2d817a 0%, #2e807b 100%)",
                    badgeColor: "#2d817a",
                    borderColor: "#2d817a"
                };
            case 'system_admin':
                return {
                    title: "System Administration",
                    icon: <FiSettings />,
                    gradient: "linear-gradient(135deg, #2d817a 0%, #2f6966 100%)",
                    badgeColor: "#2d817a",
                    borderColor: "#2d817a"
                };
            default:
                return {
                    title: "TRM Resource",
                    icon: <FiBook />,
                    gradient: "linear-gradient(135deg, #2d817a 0%, #3b9d94 100%)",
                    badgeColor: "#2d817a",
                    borderColor: "#2d817a"
                };
        }
    };

    const config = getRunbookConfig();

    return (
        <div className="runbook-card">
            <div
                className="runbook-header"
                style={{ background: config.gradient }}
            >
                <div className="runbook-icon">
                    {config.icon}
                </div>
                <h3 className="runbook-title">Procedure Guide</h3>
                <span
                    className="runbook-badge"
                >
                    {config.title}
                </span>
            </div>

            <div className="runbook-content">
                <FormattedText text={content} />
            </div>

            {sources && sources.length > 0 && (
                <div className="runbook-footer">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span className="runbook-source-label">Source:</span>
                    <span className="runbook-source-text">
                        {sources[0].replace(/_/g, ' ')}
                    </span>
                </div>
            )}
        </div>
    );
}
