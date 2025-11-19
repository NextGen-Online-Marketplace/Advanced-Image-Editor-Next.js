"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, Loader2, Check, ChevronsUpDown, X } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

const ruleTypeOptions = [
  'Total Inspections Count',
  'Total Revenue',
  'First Inspection',
  'Last Inspection',
  "Buyer's Agent Inspection Count",
  "Seller's Agent Inspection Count",
  "Buyer's Agent Revenue",
  "Seller's Agent Revenue",
  "Buyer's Agent First Inspection",
  "Seller's Agent First Inspection",
  "Buyer's Agent Last Inspection",
  "Seller's Agent Last Inspection",
];

const tagRuleSchema = z.object({
  operation: z.enum(['AND', 'OR']).optional(),
  ruleType: z.string().min(1, 'Rule type is required'),
  condition: z.enum(['Equal To', 'Greater Than', 'Less Than']),
  count: z.number().min(0, 'Count must be 0 or greater'),
  within: z.enum(['Last', 'Next']).optional(),
  days: z.number().min(1, 'Days must be at least 1').optional(),
}).refine((data) => {
  if (data.within && !data.days) {
    return false;
  }
  return true;
}, {
  message: 'Days is required when Within is selected',
  path: ['days'],
});

const tagSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
  autoTagging: z.boolean(),
  autoTagPerson: z.enum(['Agent', 'Client']).optional(),
  rules: z.array(tagRuleSchema).optional(),
  removeTagOnRuleFail: z.boolean(),
}).refine((data) => {
  if (data.autoTagging && !data.autoTagPerson) {
    return false;
  }
  return true;
}, {
  message: 'Auto Tag Person is required when Auto Tagging is enabled',
  path: ['autoTagPerson'],
}).refine((data) => {
  if (data.autoTagging && (!data.rules || data.rules.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'At least one rule is required when Auto Tagging is enabled',
  path: ['rules'],
});

type TagFormValues = z.infer<typeof tagSchema>;
type TagRule = z.infer<typeof tagRuleSchema>;

interface Tag {
  _id: string;
  name: string;
  color: string;
  autoTagging: boolean;
  autoTagPerson?: 'Agent' | 'Client';
  rules: TagRule[];
  removeTagOnRuleFail: boolean;
  createdAt: string;
  updatedAt: string;
}

// Searchable Select Component
function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !value && 'text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-60'
          )}
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onValueChange(option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function TagsManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      color: '#3b82f6',
      autoTagging: false,
      autoTagPerson: undefined,
      rules: [],
      removeTagOnRuleFail: false,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const autoTagging = watch('autoTagging');
  const rules = watch('rules') || [];

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rules',
  });

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tags', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load tags');
      }

      const data = await response.json();
      setTags(data.tags || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTag(null);
    reset({
      name: '',
      color: '#3b82f6',
      autoTagging: false,
      autoTagPerson: undefined,
      rules: [],
      removeTagOnRuleFail: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    reset({
      name: tag.name,
      color: tag.color,
      autoTagging: tag.autoTagging,
      autoTagPerson: tag.autoTagPerson,
      rules: tag.rules || [],
      removeTagOnRuleFail: tag.removeTagOnRuleFail,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag);
  };

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tags/${tagToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      toast.success('Tag deleted successfully');
      await loadTags();
      setTagToDelete(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to delete tag');
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (values: TagFormValues) => {
    try {
      setSaving(true);
      const url = editingTag ? '/api/tags' : '/api/tags';
      const method = editingTag ? 'PUT' : 'POST';

      const payload = editingTag
        ? { ...values, _id: editingTag._id }
        : values;

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
        throw new Error(errorData.error || 'Failed to save tag');
      }

      toast.success(`Tag ${editingTag ? 'updated' : 'created'} successfully`);
      await loadTags();
      setDialogOpen(false);
      setEditingTag(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Unable to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    append({
      ruleType: '',
      condition: 'Equal To',
      count: 0,
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tags Manager</h3>
          <p className="text-sm text-muted-foreground">Create and manage tags for your contacts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading tags...
          </CardContent>
        </Card>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No tags found. Click "Create" to add your first tag.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Existing Tags</CardTitle>
            <CardDescription>Manage your tags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-muted text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Color</th>
                    <th className="px-4 py-3">Auto Tagging</th>
                    <th className="px-4 py-3">Rules</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {tags.map((tag) => (
                    <tr key={tag._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{tag.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-xs text-muted-foreground">{tag.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tag.autoTagging ? (
                          <span className="text-xs">
                            {tag.autoTagPerson} ({tag.rules?.length || 0} rule{tag.rules?.length !== 1 ? 's' : ''})
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tag.rules && tag.rules.length > 0 ? (
                          <span className="text-xs">{tag.rules.length} rule{tag.rules.length !== 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tag)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(tag)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
            <DialogDescription>
              {editingTag ? 'Update tag details' : 'Create a new tag for your contacts'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Tag Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input id="name" {...field} />
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        placeholder="#3b82f6"
                        value={field.value}
                        onChange={(e) => {
                          let value = e.target.value.trim();
                          // Auto-add # if user types without it
                          if (value && !value.startsWith('#') && /^[A-Fa-f0-9]{3,6}$/.test(value)) {
                            value = '#' + value;
                          }
                          field.onChange(value);
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData('text').trim();
                          let value = pastedText;
                          // Auto-add # if pasted without it
                          if (value && !value.startsWith('#') && /^[A-Fa-f0-9]{3,6}$/.test(value)) {
                            value = '#' + value;
                          }
                          field.onChange(value);
                        }}
                        className="flex-1"
                      />
                    </>
                  )}
                />
              </div>
              {errors.color && (
                <p className="text-sm text-destructive">{errors.color.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Controller
                name="autoTagging"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="autoTagging"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                    <Label htmlFor="autoTagging" className="font-medium cursor-pointer">
                      Auto Tagging
                    </Label>
                  </div>
                )}
              />
            </div>

            {autoTagging && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="autoTagPerson">Auto Tag Person</Label>
                  <Controller
                    name="autoTagPerson"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="autoTagPerson">
                          <SelectValue placeholder="Select person type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Agent">Agent</SelectItem>
                          <SelectItem value="Client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.autoTagPerson && (
                    <p className="text-sm text-destructive">{errors.autoTagPerson.message}</p>
                  )}
                </div>

                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Label>Rules</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddRule}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Rule
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-4 border rounded-lg p-4 bg-muted/30">
                      {index > 0 && (
                        <div className="space-y-2">
                          <Label>Operation</Label>
                          <Controller
                            name={`rules.${index}.operation`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select operation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AND">AND</SelectItem>
                                  <SelectItem value="OR">OR</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Auto Tag Add Rule Type</Label>
                        <Controller
                          name={`rules.${index}.ruleType`}
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={ruleTypeOptions}
                              placeholder="Select rule type"
                            />
                          )}
                        />
                        {errors.rules?.[index]?.ruleType && (
                          <p className="text-sm text-destructive">
                            {errors.rules[index]?.ruleType?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Controller
                          name={`rules.${index}.condition`}
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Equal To">Equal To</SelectItem>
                                <SelectItem value="Greater Than">Greater Than</SelectItem>
                                <SelectItem value="Less Than">Less Than</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Count</Label>
                        <Controller
                          name={`rules.${index}.count`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              value={field.value}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          )}
                        />
                        {errors.rules?.[index]?.count && (
                          <p className="text-sm text-destructive">
                            {errors.rules[index]?.count?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Within (Optional)</Label>
                        <Controller
                          name={`rules.${index}.within`}
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Last">Last</SelectItem>
                                <SelectItem value="Next">Next</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {watch(`rules.${index}.within`) && (
                          <div className="space-y-2">
                            <Label>Days</Label>
                            <Controller
                              name={`rules.${index}.days`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                />
                              )}
                            />
                            {errors.rules?.[index]?.days && (
                              <p className="text-sm text-destructive">
                                {errors.rules[index]?.days?.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Rule
                        </Button>
                      )}
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <Button type="button" variant="outline" onClick={handleAddRule}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  )}

                  {autoTagging && fields.length > 0 && (
                    <p className="text-sm text-muted-foreground italic mt-4">
                      Note: The tag rule(s) above are considering confirmed inspections that are paid or unpaid.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Controller
                name="removeTagOnRuleFail"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="removeTagOnRuleFail"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                    <Label htmlFor="removeTagOnRuleFail" className="font-medium cursor-pointer">
                      Remove Tag on Rule Fail
                    </Label>
                  </div>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingTag(null);
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
                  editingTag ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(tagToDelete)} onOpenChange={(open) => !open && !isDeleting && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{tagToDelete?.name}"? This action cannot be undone.
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

