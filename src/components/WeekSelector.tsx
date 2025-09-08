import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WeekSelectorProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
  availableWeeks: number[];
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  currentWeek,
  onWeekChange,
  availableWeeks
}) => {
  const handlePrevious = () => {
    const currentIndex = availableWeeks.indexOf(currentWeek);
    if (currentIndex > 0) {
      onWeekChange(availableWeeks[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = availableWeeks.indexOf(currentWeek);
    if (currentIndex < availableWeeks.length - 1) {
      onWeekChange(availableWeeks[currentIndex + 1]);
    }
  };

  const canGoPrevious = availableWeeks.indexOf(currentWeek) > 0;
  const canGoNext = availableWeeks.indexOf(currentWeek) < availableWeeks.length - 1;

  const getWeekLabel = (week: number) => {
    if (week <= 18) return `Week ${week}`;
    if (week === 19) return 'Wild Card';
    if (week === 20) return 'Divisional';
    if (week === 21) return 'Conference';
    if (week === 22) return 'Super Bowl';
    return `Week ${week}`;
  };

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select
            value={currentWeek.toString()}
            onValueChange={(value) => onWeekChange(parseInt(value))}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableWeeks.map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  {getWeekLabel(week)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          NFL 2025
        </div>
      </div>
    </div>
  );
};
