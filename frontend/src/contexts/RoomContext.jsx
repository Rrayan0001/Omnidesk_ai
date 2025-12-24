import { createContext, useContext, useState } from 'react';
import { ROOMS, DEFAULT_ROOM } from '@/services/config';

// Convert ROOMS object to array with id property
const roomsArray = Object.entries(ROOMS).map(([id, room]) => ({
    id,
    ...room
}));

const RoomContext = createContext({
    currentRoom: DEFAULT_ROOM,
    setCurrentRoom: () => { },
    rooms: roomsArray,
});

export function RoomProvider({ children }) {
    const [currentRoom, setCurrentRoom] = useState(DEFAULT_ROOM);

    return (
        <RoomContext.Provider value={{ currentRoom, setCurrentRoom, rooms: roomsArray }}>
            {children}
        </RoomContext.Provider>
    );
}

export const useRoom = () => useContext(RoomContext);
