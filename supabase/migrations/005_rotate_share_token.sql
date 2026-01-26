-- Rotate workspace share tokens (invalidate existing links)
CREATE OR REPLACE FUNCTION rotate_workspace_share_token(
  p_workspace_id UUID,
  p_passphrase TEXT
) RETURNS TEXT AS $$
DECLARE
  v_is_valid BOOLEAN;
  v_token TEXT;
BEGIN
  IF p_workspace_id IS NULL OR p_passphrase IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_valid := verify_passphrase(p_workspace_id, p_passphrase);
  IF NOT v_is_valid THEN
    RETURN NULL;
  END IF;

  UPDATE workspace_share_tokens
  SET revoked_at = NOW()
  WHERE workspace_id = p_workspace_id AND revoked_at IS NULL;

  v_token := create_workspace_share_token(p_workspace_id);

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
