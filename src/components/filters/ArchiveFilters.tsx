
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type DateRange = {
  from?: Date;
  to?: Date;
};

interface ArchiveFiltersProps {
  onFilter: (status: string | null, date: DateRange | null, query: string | null) => void;
}

const statuses = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "archived",
    label: "Archived",
  },
];

const ArchiveFilters = ({ onFilter }: ArchiveFiltersProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateRange | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const handleStatusSelect = (value: string) => {
    setSelectedStatus(value);
    setStatus(value === "all" ? null : value);
    setOpen(false);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedDate(range);
    setDate({
      from: range?.from || undefined,
      to: range?.to || undefined
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const applyFilters = () => {
    onFilter(status, date, query);
  };

  const clearFilters = () => {
    setStatus(null);
    setDate(null);
    setQuery(null);
    setSelectedDate(undefined);
    setSelectedStatus(null);
    onFilter(null, null, null);
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
      {/* Status Filter */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {status
              ? statuses.find((s) => s.value === status)?.label
              : "Select status"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search status..." />
              <CommandEmpty>No status found.</CommandEmpty>
              <CommandGroup>
                {statuses.map((status) => (
                  <CommandItem
                    key={status.value}
                    value={status.value}
                    onSelect={() => handleStatusSelect(status.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedStatus === status.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {status.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date?.from && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {selectedDate?.from ? (
              selectedDate.to ? (
                `${format(selectedDate.from, "MMM dd, yyyy")} - ${format(
                  selectedDate.to,
                  "MMM dd, yyyy"
                )}`
              ) : (
                format(selectedDate.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={selectedDate}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Search Input */}
      <div className="col-span-1 md:col-span-2 flex items-center space-x-2">
        <Label htmlFor="search" className="hidden">
          Search:
        </Label>
        <Input
          type="search"
          id="search"
          placeholder="Search..."
          value={query || ""}
          onChange={handleSearch}
          className="flex-1"
        />
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <Button onClick={applyFilters} className="bg-doculaw-500 hover:bg-doculaw-600">
          Apply Filters
        </Button>
        <Button variant="ghost" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default ArchiveFilters;
