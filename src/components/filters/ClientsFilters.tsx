import { useState } from 'react';
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClientsFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (type: string, value: string) => void;
}

const ClientsFilters = ({ onSearch, onFilterChange }: ClientsFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = () => {
    onSearch(searchQuery);
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        
        <div className="flex items-center gap-2">
          <Select onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          <Button className="bg-doculaw-500 hover:bg-doculaw-600" onClick={handleSearch}>
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientsFilters;
