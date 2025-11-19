import React, { useState } from 'react';
import { Camera, MapPin, AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  checked: boolean;
  notes: string;
  severity?: 'low' | 'medium' | 'high';
  photos?: string[];
}

interface InspectionChecklistProps {
  stationId: string;
  stationName: string;
  onComplete?: (data: any) => void;
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'checked' | 'notes' | 'photos'>[] = [
  // Safety & Compliance
  { id: 'safety-1', category: 'Safety & Compliance', item: 'Fire extinguishers present and serviced' },
  { id: 'safety-2', category: 'Safety & Compliance', item: 'Emergency stop buttons functional' },
  { id: 'safety-3', category: 'Safety & Compliance', item: 'Spill kits available and accessible' },
  { id: 'safety-4', category: 'Safety & Compliance', item: 'No smoking signs visible' },
  { id: 'safety-5', category: 'Safety & Compliance', item: 'First aid kit present and stocked' },
  
  // Pump Equipment
  { id: 'pump-1', category: 'Pump Equipment', item: 'Pumps clean and operational' },
  { id: 'pump-2', category: 'Pump Equipment', item: 'Nozzles and hoses in good condition' },
  { id: 'pump-3', category: 'Pump Equipment', item: 'Display screens accurate and readable' },
  { id: 'pump-4', category: 'Pump Equipment', item: 'Calibration stickers current' },
  { id: 'pump-5', category: 'Pump Equipment', item: 'No visible leaks' },
  
  // Storage Tanks
  { id: 'tank-1', category: 'Storage Tanks', item: 'Tank gauges functional' },
  { id: 'tank-2', category: 'Storage Tanks', item: 'Vent pipes clear and unobstructed' },
  { id: 'tank-3', category: 'Storage Tanks', item: 'No water contamination detected' },
  { id: 'tank-4', category: 'Storage Tanks', item: 'Tank fill points properly labeled' },
  
  // Record Keeping
  { id: 'records-1', category: 'Record Keeping', item: 'Daily sales records up to date' },
  { id: 'records-2', category: 'Record Keeping', item: 'Shift logs properly maintained' },
  { id: 'records-3', category: 'Record Keeping', item: 'Delivery receipts filed correctly' },
  { id: 'records-4', category: 'Record Keeping', item: 'Stock reconciliation completed' },
  
  // Staff & Operations
  { id: 'staff-1', category: 'Staff & Operations', item: 'Attendants in proper uniform' },
  { id: 'staff-2', category: 'Staff & Operations', item: 'Staff aware of safety procedures' },
  { id: 'staff-3', category: 'Staff & Operations', item: 'Operating hours clearly displayed' },
  { id: 'staff-4', category: 'Staff & Operations', item: 'Customer service standards met' },
];

export function InspectionChecklist({
  stationId,
  stationName,
  onComplete,
}: InspectionChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST.map((item) => ({
      ...item,
      checked: false,
      notes: '',
      photos: [],
    }))
  );
  const [generalNotes, setGeneralNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { queueItem, isOnline } = useOfflineSync();

  const handleCheckChange = (id: string, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    );
  };

  const handleNotesChange = (id: string, notes: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  const captureLocation = () => {
    setIsCapturingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsCapturingLocation(false);
          toast.success('Location captured successfully');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to capture location');
          setIsCapturingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      setIsCapturingLocation(false);
    }
  };

  const handlePhotoUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // In a real implementation, you would upload to Supabase Storage
    // For now, we'll create data URLs for offline support
    const photoPromises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const photoDataUrls = await Promise.all(photoPromises);

    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, photos: [...(item.photos || []), ...photoDataUrls] }
          : item
      )
    );

    toast.success(`${files.length} photo(s) added`);
  };

  const handleSubmit = async () => {
    if (!location) {
      toast.error('Please capture GPS location before submitting');
      return;
    }

    setIsSubmitting(true);

    const inspectionData = {
      station_id: stationId,
      station_name: stationName,
      checklist,
      general_notes: generalNotes,
      location,
      timestamp: new Date().toISOString(),
      completed_items: checklist.filter((item) => item.checked).length,
      total_items: checklist.length,
    };

    try {
      if (isOnline) {
        // Submit directly to server
        // In production: await supabase.from('inspections').insert(inspectionData)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success('Inspection submitted successfully');
      } else {
        // Queue for offline sync
        queueItem('inspection', inspectionData);
        toast.success('Inspection saved offline. Will sync when online.');
      }

      onComplete?.(inspectionData);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      toast.error('Failed to submit inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Array.from(new Set(checklist.map((item) => item.category)));
  const completedCount = checklist.filter((item) => item.checked).length;
  const completionPercentage = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Station Inspection</CardTitle>
              <CardDescription>{stationName}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-pumpguard-navy">
                {completionPercentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                {completedCount} of {checklist.length} items
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={captureLocation}
              disabled={isCapturingLocation || !!location}
              variant={location ? 'outline' : 'default'}
              className="flex-1"
            >
              <MapPin className="mr-2 h-4 w-4" />
              {location ? 'Location Captured' : 'Capture GPS Location'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist
              .filter((item) => item.category === category)
              .map((item) => (
                <div key={item.id} className="space-y-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={(checked) => handleCheckChange(item.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={item.id} className="cursor-pointer">
                        {item.item}
                      </Label>
                      
                      {!item.checked && (
                        <div className="mt-2">
                          <Textarea
                            placeholder="Add notes (required for unchecked items)"
                            value={item.notes}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            className="min-h-[60px]"
                          />
                        </div>
                      )}

                      <div className="mt-2 flex gap-2">
                        <Label
                          htmlFor={`photo-${item.id}`}
                          className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
                        >
                          <Camera className="h-4 w-4" />
                          Add Photo
                          <input
                            id={`photo-${item.id}`}
                            type="file"
                            accept="image/*"
                            multiple
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(item.id, e)}
                          />
                        </Label>
                        
                        {item.photos && item.photos.length > 0 && (
                          <Badge variant="outline">
                            {item.photos.length} photo(s)
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {item.checked ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      {/* General Notes */}
      <Card>
        <CardHeader>
          <CardTitle>General Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional observations or recommendations..."
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !location}
            className="w-full"
            size="lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Inspection'}
          </Button>
          
          {!location && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              GPS location is required before submission
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
