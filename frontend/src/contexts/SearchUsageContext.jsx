import { createContext, useContext, useState, useEffect } from 'react';

const SearchUsageContext = createContext();

export function SearchUsageProvider({ children }) {
    const LIMIT = 100;
    const [usageCount, setUsageCount] = useState(0);

    // Load from local storage on mount
    useEffect(() => {
        const storedUsage = localStorage.getItem('search_usage_count');
        const storedDate = localStorage.getItem('search_usage_date');
        const today = new Date().toDateString();

        if (storedDate === today) {
            if (storedUsage) {
                setUsageCount(parseInt(storedUsage, 10));
            }
        } else {
            // Reset if it's a new day
            setUsageCount(0);
            localStorage.setItem('search_usage_count', '0');
            localStorage.setItem('search_usage_date', today);
        }
    }, []);

    const incrementUsage = () => {
        setUsageCount((prev) => {
            const newCount = prev + 1;
            localStorage.setItem('search_usage_count', newCount.toString());
            localStorage.setItem('search_usage_date', new Date().toDateString());
            return newCount;
        });
    };

    return (
        <SearchUsageContext.Provider value={{ usageCount, limit: LIMIT, incrementUsage }}>
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
