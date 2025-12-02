import { Button } from "@/components/ui/button";
import { useRoom } from "@/contexts/RoomContext";
import { Code, BookOpen, Palette, Scale, Building2 } from 'lucide-react';

const iconMap = {
    Code: Code,
    BookOpen: BookOpen,
    Palette: Palette,
    Scale: Scale,
    Building2: Building2
};

export default function RoomDetectionModal({ detectedRoom, onProceed, onCancel }) {
    const { currentRoom, setCurrentRoom, rooms } = useRoom();

    if (!detectedRoom) return null;

    const detected = rooms.find(r => r.id === detectedRoom);
    const current = rooms.find(r => r.id === currentRoom);

    if (!detected || !current) return null;

    const IconComponent = iconMap[detected.icon] || Building2; // Fallback to Building2

    // If detected room matches current room, auto-proceed
    if (detectedRoom === currentRoom) {
        setTimeout(() => onProceed(currentRoom), 0);
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-background border border-border rounded-lg shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <IconComponent className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            Detected Mode
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {detected.name}
                        </p>
                    </div>
                </div>

                <p className="text-sm text-secondary-foreground mb-6">
                    This prompt seems best suited for <span className="font-semibold text-primary">{detected.name}</span>.
                    You're currently in <span className="font-semibold">{current.name}</span>.
                </p>

                <div className="flex flex-col gap-2">
                    <Button
                        onClick={() => {
                            setCurrentRoom(detectedRoom);
                            onProceed(detectedRoom);
                        }}
                        className="w-full"
                    >
                        Switch to {detected.name} & Proceed
                    </Button>
                    <Button
                        onClick={() => onProceed(currentRoom)}
                        variant="outline"
                        className="w-full"
                    >
                        Stay in {current.name}
                    </Button>
                    <Button
                        onClick={onCancel}
                        variant="ghost"
                        className="w-full text-muted-foreground"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
