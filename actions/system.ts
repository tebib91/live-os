'use server';

import os from 'os';

export async function getSystemUsername() {
    try {
        return os.userInfo().username;
    } catch (error) {
        return 'User';
    }
}

export async function getSystemInfo() {
    try {
        const userInfo = os.userInfo();
        return {
            username: userInfo.username,
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
        };
    } catch (error) {
        return {
            username: 'User',
            hostname: 'localhost',
            platform: 'unknown',
            arch: 'unknown',
        };
    }
}
