-- System categories (user_id IS NULL = visible to all users)
-- These cannot be deleted by users (RLS blocks it — no user_id matches)

INSERT INTO public.categories (name, type, color, icon) VALUES
  -- Income categories
  ('Salário', 'income', '#10B981', 'briefcase'),
  ('Freelance', 'income', '#3B82F6', 'laptop'),
  ('Investimentos', 'income', '#8B5CF6', 'trending-up'),
  ('Aluguel Recebido', 'income', '#F59E0B', 'home'),
  ('Outros (Receita)', 'income', '#6B7280', 'plus-circle'),

  -- Expense categories
  ('Moradia', 'expense', '#EF4444', 'home'),
  ('Alimentação', 'expense', '#F97316', 'utensils'),
  ('Transporte', 'expense', '#EAB308', 'car'),
  ('Saúde', 'expense', '#EC4899', 'heart'),
  ('Educação', 'expense', '#06B6D4', 'book'),
  ('Lazer', 'expense', '#8B5CF6', 'smile'),
  ('Vestuário', 'expense', '#F59E0B', 'shopping-bag'),
  ('Tecnologia', 'expense', '#3B82F6', 'smartphone'),
  ('Serviços', 'expense', '#6366F1', 'tool'),
  ('Outros (Despesa)', 'expense', '#6B7280', 'minus-circle');
