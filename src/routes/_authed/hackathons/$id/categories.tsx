import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authed/hackathons/$id/categories')({
  component: HackathonCategoriesPage,
})

function HackathonCategoriesPage() {
  const { id } = Route.useParams()
  const hackathonId = id as Id<"hackathons">
  const categories = useQuery(api.categories.listByHackathon, { hackathonId })
  const createCategory = useMutation(api.categories.create)
  const updateCategory = useMutation(api.categories.update)
  const removeCategory = useMutation(api.categories.remove)
  const reorderCategories = useMutation(api.categories.reorder)

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  if (categories === undefined) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  async function handleAdd() {
    if (!newName.trim()) return
    try {
      await createCategory({
        hackathonId,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      })
      setNewName('')
      setNewDescription('')
      setShowAdd(false)
      toast.success('Category added')
    } catch (error) {
      toast.error('Failed to add category')
    }
  }

  async function handleUpdate(catId: Id<"categories">) {
    if (!editName.trim()) return
    try {
      await updateCategory({
        id: catId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })
      setEditingId(null)
      toast.success('Category updated')
    } catch (error) {
      toast.error('Failed to update category')
    }
  }

  async function handleDelete(catId: Id<"categories">) {
    try {
      await removeCategory({ id: catId })
      toast.success('Category deleted')
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (!categories) return
    const newOrder = [...categories]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newOrder.length) return

    ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]
    const orderedIds = newOrder.map((c) => c._id)

    try {
      await reorderCategories({ hackathonId, orderedIds })
    } catch (error) {
      toast.error('Failed to reorder')
    }
  }

  function startEdit(cat: { _id: Id<"categories">; name: string; description?: string }) {
    setEditingId(cat._id)
    setEditName(cat.name)
    setEditDescription(cat.description ?? '')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Button onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-4">
          <CardContent className="pt-6 space-y-4">
            <Input
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!newName.trim()}>
                <Check className="mr-2 h-4 w-4" />
                Add
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdd(false)
                  setNewName('')
                  setNewDescription('')
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No categories yet. Add one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <Card key={cat._id}>
              <CardContent className="flex items-center gap-4 py-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === categories.length - 1}
                    onClick={() => handleMove(index, 'down')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                {editingId === cat._id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      placeholder="Description (optional)"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(cat._id)} disabled={!editName.trim()}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{cat.name}</p>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {editingId !== cat._id && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(cat)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cat._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
