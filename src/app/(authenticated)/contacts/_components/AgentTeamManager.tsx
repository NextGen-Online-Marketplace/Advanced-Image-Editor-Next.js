"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, Loader2, Search, ChevronsUpDown, X } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DataTable, Column } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

const agentTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  agents: z.array(z.string()).optional(),
});

type AgentTeamFormValues = z.infer<typeof agentTeamSchema>;

interface Agent {
  _id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  photoUrl?: string;
}

interface AgentTeam {
  _id: string;
  name: string;
  agents?: Agent[];
  createdAt: string;
  updatedAt: string;
}

// Agent Search Component for Multi-Select
function AgentSearchMultiSelect({
  selectedAgents,
  onAddAgent,
  onRemoveAgent,
  disabled = false,
}: {
  selectedAgents: Agent[];
  onAddAgent: (agent: Agent) => void;
  onRemoveAgent: (agentId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce search query
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      return;
    }

    const timer = setTimeout(() => {
      searchAgents(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open]);

  // Load initial agents when popover opens
  useEffect(() => {
    if (open && !searchQuery.trim()) {
      searchAgents('');
    }
  }, [open]);

  const searchAgents = async (search: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) {
        params.append('search', search.trim());
      }
      params.append('limit', '50');

      const response = await fetch(`/api/agents/search?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to search agents');
      }

      const data = await response.json();
      // Filter out already selected agents
      const selectedIds = selectedAgents.map((a) => a._id);
      const filteredAgents = (data.agents || []).filter(
        (agent: Agent) => !selectedIds.includes(agent._id)
      );
      setAgents(filteredAgents);
    } catch (error: any) {
      console.error('Error searching agents:', error);
      toast.error('Failed to search agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    onAddAgent(agent);
    setSearchQuery('');
    setOpen(false); // Close the dropdown after selection
  };

  const getAgentDisplayName = (agent: Agent) => {
    return `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email || 'Unnamed Agent';
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="text-muted-foreground">Search and select agents...</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search agents by name or email..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  Searching...
                </div>
              ) : agents.length > 0 ? (
                <CommandGroup>
                  {agents.map((agent) => (
                    <CommandItem
                      key={agent._id}
                      value={agent._id}
                      onSelect={() => handleSelectAgent(agent)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {agent.photoUrl ? (
                          <img
                            src={agent.photoUrl}
                            alt={getAgentDisplayName(agent)}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {agent.firstName?.charAt(0) || agent.email?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{getAgentDisplayName(agent)}</div>
                          {agent.email && (
                            <div className="text-xs text-muted-foreground">{agent.email}</div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>
                  {searchQuery.trim() ? 'No agents found' : 'Start typing to search agents'}
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAgents.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedAgents.map((agent) => (
            <div
              key={agent._id}
              className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-sm"
            >
              {agent.photoUrl ? (
                <img
                  src={agent.photoUrl}
                  alt={getAgentDisplayName(agent)}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-medium">
                  {agent.firstName?.charAt(0) || agent.email?.charAt(0) || '?'}
                </div>
              )}
              <span>{getAgentDisplayName(agent)}</span>
              <button
                type="button"
                onClick={() => onRemoveAgent(agent._id)}
                className="text-destructive hover:text-destructive/80 ml-1"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentTeamManager() {
  const [agentTeams, setAgentTeams] = useState<AgentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgentTeam, setEditingAgentTeam] = useState<AgentTeam | null>(null);
  const [agentTeamToDelete, setAgentTeamToDelete] = useState<AgentTeam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const form = useForm<AgentTeamFormValues>({
    resolver: zodResolver(agentTeamSchema),
    defaultValues: {
      name: '',
      agents: [],
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    loadAgentTeams(pagination.page, pagination.limit, searchQuery);
  }, [pagination.page, pagination.limit, searchQuery]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadAgentTeams = async (
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/agent-teams?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load agent teams');
      }

      const data = await response.json();
      setAgentTeams(data.agentTeams || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to load agent teams');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const columns: Column<AgentTeam>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: 'agents',
      header: 'Agents',
      cell: (row) => (
        <div>
          {row.agents && row.agents.length > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">
                {row.agents.length} agent{row.agents.length !== 1 ? 's' : ''}
              </span>
              <div className="flex -space-x-2">
                {row.agents.slice(0, 3).map((agent) => (
                  <div
                    key={agent._id}
                    className="w-6 h-6 rounded-full border-2 border-background overflow-hidden bg-muted"
                    title={`${agent.firstName} ${agent.lastName || ''}`.trim() || agent.email}
                  >
                    {agent.photoUrl ? (
                      <img
                        src={agent.photoUrl}
                        alt={agent.firstName || agent.email}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                        {agent.firstName?.charAt(0) || agent.email?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                ))}
                {row.agents.length > 3 && (
                  <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                    +{row.agents.length - 3}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No agents</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingAgentTeam(null);
    setSelectedAgents([]);
    reset({
      name: '',
      agents: [],
    });
    setDialogOpen(true);
  };

  const handleEdit = (agentTeam: AgentTeam) => {
    setEditingAgentTeam(agentTeam);
    setSelectedAgents(agentTeam.agents || []);
    reset({
      name: agentTeam.name || '',
      agents: (agentTeam.agents || []).map((a) => a._id),
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (agentTeam: AgentTeam) => {
    setAgentTeamToDelete(agentTeam);
  };

  const handleConfirmDelete = async () => {
    if (!agentTeamToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/agent-teams/${agentTeamToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent team');
      }

      toast.success('Agent team deleted successfully');
      await loadAgentTeams(pagination.page, pagination.limit, searchQuery);
      setAgentTeamToDelete(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to delete agent team');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddAgent = (agent: Agent) => {
    if (!selectedAgents.some((a) => a._id === agent._id)) {
      const newAgents = [...selectedAgents, agent];
      setSelectedAgents(newAgents);
      const currentAgents = form.getValues('agents') || [];
      form.setValue('agents', [...currentAgents, agent._id]);
    }
  };

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter((a) => a._id !== agentId));
    const currentAgents = form.getValues('agents') || [];
    form.setValue('agents', currentAgents.filter((id) => id !== agentId));
  };

  const onSubmit = async (values: AgentTeamFormValues) => {
    try {
      setSaving(true);

      // Get all agent IDs from selectedAgents
      const agentIds: string[] = selectedAgents.map((agent) => agent._id);

      // Also check form values.agents for any additional agent IDs
      if (values.agents && Array.isArray(values.agents)) {
        for (const agentId of values.agents) {
          if (typeof agentId === 'string' && !agentIds.includes(agentId)) {
            if (agentId.match(/^[0-9a-fA-F]{24}$/)) {
              agentIds.push(agentId);
            }
          }
        }
      }

      const url = editingAgentTeam ? '/api/agent-teams' : '/api/agent-teams';
      const method = editingAgentTeam ? 'PUT' : 'POST';

      const payload: any = {
        name: values.name.trim(),
        agents: agentIds,
      };

      if (editingAgentTeam) {
        payload._id = editingAgentTeam._id;
      }

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save agent team');
      }

      toast.success(`Agent team ${editingAgentTeam ? 'updated' : 'created'} successfully`);
      await loadAgentTeams(pagination.page, pagination.limit, searchQuery);
      setDialogOpen(false);
      setEditingAgentTeam(null);
      setSelectedAgents([]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to save agent team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agent Teams</h3>
          <p className="text-sm text-muted-foreground">Manage your agent teams</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Search by Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Agent Teams</CardTitle>
          <CardDescription>Manage your agent teams</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={agentTeams}
            loading={loading}
            pagination={
              pagination.totalPages > 0
                ? {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: pagination.total,
                    totalPages: pagination.totalPages,
                    onPageChange: handlePageChange,
                  }
                : undefined
            }
            emptyMessage="No agent teams found. Click 'Create' to add your first team."
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgentTeam ? 'Edit Agent Team' : 'Create Agent Team'}</DialogTitle>
            <DialogDescription>
              {editingAgentTeam ? 'Update agent team details' : 'Create a new agent team'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input id="name" {...field} placeholder="Enter team name" />
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Agents</Label>
              <AgentSearchMultiSelect
                selectedAgents={selectedAgents}
                onAddAgent={handleAddAgent}
                onRemoveAgent={handleRemoveAgent}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Search and select multiple agents to add to this team
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingAgentTeam(null);
                  setSelectedAgents([]);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingAgentTeam ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(agentTeamToDelete)} onOpenChange={(open) => !open && !isDeleting && setAgentTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent Team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agentTeamToDelete?.name || ''}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

