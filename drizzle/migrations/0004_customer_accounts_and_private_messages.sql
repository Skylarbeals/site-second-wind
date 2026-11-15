ALTER TABLE public.quote_requests ADD COLUMN customer_user_id uuid;
ALTER TABLE public.quote_requests ADD COLUMN customer_stage text NOT NULL DEFAULT 'received';
CREATE INDEX quote_requests_customer_idx ON public.quote_requests(customer_user_id);
CREATE FUNCTION public.assign_request_customer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.customer_user_id := auth.uid();
  NEW.customer_stage := 'received';
  IF auth.uid() IS NOT NULL THEN
    NEW.customer_email := auth.jwt()->>'email';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assign_request_customer BEFORE INSERT ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.assign_request_customer();
CREATE POLICY "Customers read own requests" ON public.quote_requests FOR SELECT TO authenticated USING (customer_user_id = auth.uid());
CREATE FUNCTION public.assign_customer_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.user_roles(user_id,role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER assign_customer_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_customer_role();
CREATE TABLE public.customer_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL,
 sender_is_admin boolean NOT NULL DEFAULT false,
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.customer_messages TO authenticated;
GRANT ALL ON public.customer_messages TO service_role;
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.customer_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id=request_id AND (q.customer_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Participants send messages" ON public.customer_messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() AND EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id=request_id AND q.customer_user_id IS NOT NULL AND (q.customer_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE FUNCTION public.stamp_customer_message() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.sender_id := auth.uid();
 NEW.sender_is_admin := public.has_role(auth.uid(),'admin');
 NEW.created_at := clock_timestamp();
 RETURN NEW;
END $$;
CREATE TRIGGER stamp_customer_message BEFORE INSERT ON public.customer_messages FOR EACH ROW EXECUTE FUNCTION public.stamp_customer_message();
CREATE INDEX customer_messages_request_idx ON public.customer_messages(request_id,created_at);
CREATE TABLE public.message_reads (
 request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (request_id,user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own message receipts" ON public.message_reads FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Insert own message receipts" ON public.message_reads FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.quote_requests q WHERE q.id=request_id AND (q.customer_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Update own message receipts" ON public.message_reads FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.quote_requests q WHERE q.id=request_id AND (q.customer_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE FUNCTION public.sync_customer_stages() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.quote_requests q SET customer_stage = CASE o->>'status' WHEN 'queued' THEN 'queued' WHEN 'in_progress' THEN 'in_progress' WHEN 'completed' THEN 'completed' ELSE q.customer_stage END
 FROM jsonb_array_elements(COALESCE(NEW.data->'orders','[]'::jsonb)) o
 WHERE q.order_id=o->>'id' AND q.customer_stage IS DISTINCT FROM o->>'status';
 RETURN NEW;
END $$;
CREATE TRIGGER sync_customer_stages AFTER INSERT OR UPDATE OF data ON public.shop_state FOR EACH ROW EXECUTE FUNCTION public.sync_customer_stages();
CREATE FUNCTION public.initial_customer_stage() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.status='closed' THEN NEW.customer_stage:='closed';
 ELSIF NEW.order_id IS NOT NULL AND OLD.order_id IS DISTINCT FROM NEW.order_id THEN NEW.customer_stage:='queued';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER initial_customer_stage BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.initial_customer_stage();
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;