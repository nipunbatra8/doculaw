
import { useState } from 'react';
import { Calendar as CalendarIcon, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ArchiveFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (type: string, value: string) => void;
  onDateChange: (dates: { from?: Date; to?: Date }) => void;
}

// Define DateRange to match the type expected by react-day-picker
type DateRange = {
  from?: Date;
  to?: Date;
};

const ArchiveFilters = ({ onSearch, onFilterChange, onDateChange }: ArchiveFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState<DateRange>({});
  
  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    // Ensure we're handling undefined properly
    const newRange = selectedDate || {};
    setDate(newRange);
    if (newRange.from || newRange.to) {
      onDateChange(newRange);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        
        <div className="flex items-center gap-2">
          <Select onValueChange={(value) => onFilterChange('caseType', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Case Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Personal Injury">Personal Injury</SelectItem>
              <SelectItem value="Business Dispute">Business Dispute</SelectItem>
              <SelectItem value="Family Law">Family Law</SelectItem>
              <SelectItem value="Estate Planning">Estate Planning</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  "Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button className="bg-doculaw-500 hover:bg-doculaw-600" onClick={handleSearch}>
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveFilters;
