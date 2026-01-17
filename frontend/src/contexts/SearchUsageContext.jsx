import { createContext, useContext, useState, useEffect } from 'react';

const SearchUsageContext = createContext();

export function SearchUsageProvider({ children }) {
    const GOOGLE_LIMIT = 100;
    const ALPHA_VANTAGE_LIMIT = 25;

    const [googleUsageCount, setGoogleUsageCount] = useState(0);
    const [alphaVantageUsageCount, setAlphaVantageUsageCount] = useState(0);

    // Load from local storage on mount
    useEffect(() => {
        const storedGoogleUsage = localStorage.getItem('google_search_usage_count');
        const storedAlphaUsage = localStorage.getItem('alpha_vantage_usage_count');
        const storedDate = localStorage.getItem('search_usage_date');
        const today = new Date().toDateString();

        if (storedDate === today) {
            if (storedGoogleUsage) {
                setGoogleUsageCount(parseInt(storedGoogleUsage, 10));
            }
            if (storedAlphaUsage) {
                setAlphaVantageUsageCount(parseInt(storedAlphaUsage, 10));
            }
        } else {
            // Reset if it's a new day
            setGoogleUsageCount(0);
            setAlphaVantageUsageCount(0);
            localStorage.setItem('google_search_usage_count', '0');
            localStorage.setItem('alpha_vantage_usage_count', '0');
            localStorage.setItem('search_usage_date', today);
        }
    }, []);

    const incrementGoogleUsage = () => {
        setGoogleUsageCount((prev) => {
            const newCount = prev + 1;
            localStorage.setItem('google_search_usage_count', newCount.toString());
            localStorage.setItem('search_usage_date', new Date().toDateString());
            return newCount;
        });
    };

    const incrementAlphaVantageUsage = () => {
        setAlphaVantageUsageCount((prev) => {
            const newCount = prev + 1;
            localStorage.setItem('alpha_vantage_usage_count', newCount.toString());
            localStorage.setItem('search_usage_date', new Date().toDateString());
            return newCount;
        });
    };

    // Legacy function for backward compatibility
    const incrementUsage = () => {
        incrementGoogleUsage();
    };

    // Check if Alpha Vantage limit is reached
    const isAlphaVantageLimitReached = () => {
        return alphaVantageUsageCount >= ALPHA_VANTAGE_LIMIT;
    };

    return (
        <SearchUsageContext.Provider value={{
            // Legacy (for backward compatibility with UI)
            usageCount: googleUsageCount,
            limit: GOOGLE_LIMIT,
            incrementUsage,

            // New granular tracking
            googleUsageCount,
            googleLimit: GOOGLE_LIMIT,
            incrementGoogleUsage,

            alphaVantageUsageCount,
            alphaVantageLimit: ALPHA_VANTAGE_LIMIT,
            incrementAlphaVantageUsage,
            isAlphaVantageLimitReached
        }}>
            {children}
        </SearchUsageContext.Provider>
    );
}

export function useSearchUsage() {
    const context = useContext(SearchUsageContext);
    if (!context) {
        throw new Error('useSearchUsage must be used within a SearchUsageProvider');
    }
    return context;
}
