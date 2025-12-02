import { createContext, useContext, useState } from 'react';

const RoomContext = createContext({
    currentRoom: 'decision',
    setCurrentRoom: () => { },
    rooms: [],
});

export function RoomProvider({ children }) {
    const [currentRoom, setCurrentRoom] = useState('decision');
    const [rooms, setRooms] = useState([]);

    return (
        <RoomContext.Provider value={{ currentRoom, setCurrentRoom, rooms, setRooms }}>
            {children}
        </RoomContext.Provider>
    );
}

export const useRoom = () => useContext(RoomContext);
