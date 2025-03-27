# Database Policies

## Storage Policies
For the `inventory-avatar` bucket, add these policies:

```sql
CREATE POLICY "Allow authenticated users to select from inventory-avatar bucket" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'inventory-avatar');

CREATE POLICY "Allow authenticated users to insert into inventory-avatar bucket" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'inventory-avatar');

CREATE POLICY "Allow authenticated users to update inventory-avatar bucket" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'inventory-avatar') 
WITH CHECK (bucket_id = 'inventory-avatar');

CREATE POLICY "Allow authenticated users to delete from inventory-avatar bucket" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'inventory-avatar');
```

## Table Policies

```sql
CREATE POLICY "Allow authenticated users to select" ON public.categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.categories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.categories
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.customers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.customers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.customers
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.products
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.purchase_returns
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.purchase_returns
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.purchase_returns
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.purchase_returns
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.purchases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.purchases
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.purchases
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.sales
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.sales
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.stock_movements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.stock_movements
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.stock_movements
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.suppliers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.suppliers
FOR DELETE
TO authenticated
USING (true);
```