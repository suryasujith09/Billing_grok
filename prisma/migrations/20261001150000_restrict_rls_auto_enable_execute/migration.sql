DO $migration$
DECLARE
  role_name text;
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC';

    FOR role_name IN
      SELECT rolname
      FROM pg_roles
      WHERE rolname IN ('anon', 'authenticated', 'service_role')
    LOOP
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM %I',
        role_name
      );
    END LOOP;
  END IF;
END
$migration$;
