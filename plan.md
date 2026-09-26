1. **Import `Trash2` icon and setup states/handlers in `StockControlSection.tsx`**:
   - Add `Trash2` to the `lucide-react` imports.
   - We'll need a confirmation step for deletion. Since there's no native generic confirm dialog currently apparent, we can use `window.confirm` for simplicity, or just build a quick small delete button with a double-check if required. We will use `window.confirm`.
   - Create `handleDeleteProduct` function in `StockControlSection.tsx` that calls `productService.deleteProduct(id)`.
   - Call `loadData(true)` on success and show a toast.
2. **Add `[ + Novo Produto ]` button**:
   - Locate the header section with "Recarregar catálogo de produtos" in `StockControlSection.tsx`.
   - Add a button before the refresh button with a `Plus` icon and text "Novo Produto".
   - When clicked, it sets `editingProduct` to `null` and opens the modal (`setIsEditDialogOpen(true)`).
3. **Add delete button to each product row**:
   - Next to the edit (`Pencil`) button in `StockControlSection.tsx`, add a `Trash2` button.
   - On click, it triggers `handleDeleteProduct(product)`.
4. **Update `onSaved` logic in `StockControlSection.tsx`**:
   - Ensure the modal's `onSaved` properly checks if the product exists. If yes, it updates it via `prev.map`. If not, it prepends the new product to the list (`[updatedProduct, ...prev]`).
   - The user also requested to just `loadData(true)` to ensure it matches server state, so we can do that as well.
5. **Pre-commit checks**:
   - Ensure `npx tsc --noEmit` works without any errors.
