'use client';

import React from 'react';

interface HighlightTextProps {
    text: string;
    query: string;
}

export default function HighlightText({ text, query }: HighlightTextProps) {
    if (!query.trim()) return <>{text}</>;

    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} style={{ backgroundColor: 'rgba(255, 171, 0, 0.4)', color: '#fff', borderRadius: 2, padding: '0 2px' }}>
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
}
