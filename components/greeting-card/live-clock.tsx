'use client';

import { useEffect, useState } from 'react';

export function LiveClock() {
    const [time, setTime] = useState<string>('');
    const [date, setDate] = useState<string>('');

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();

            // Time format
            setTime(now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }));

            // Full date format (e.g., "Thursday, January 2, 2026")
            setDate(now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));
        };

        // Set initial values
        updateDateTime();

        // Update every second
        const interval = setInterval(updateDateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-end gap-1">
            <span className="text-2xl font-semibold text-gray-900 dark:text-white drop-shadow-sm">
                {time}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 drop-shadow-sm">
                {date}
            </span>
        </div>
    );
}
