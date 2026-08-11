import re


def validar_cnpj(cnpj: str) -> bool:
    """
    Validação matemática do algoritmo do CNPJ (Cadastro Nacional da Pessoa Jurídica).
    Retorna True se for um CNPJ válido, False caso contrário.
    """
    # Remove qualquer caractere não numérico
    cnpj_limpo = re.sub(r"\D", "", cnpj)
    
    if len(cnpj_limpo) != 14 or not cnpj_limpo.isdigit():
        return False

    # Bloqueia sequências de dígitos idênticos (ex: 11111111111111)
    if len(set(cnpj_limpo)) == 1:
        return False

    # Primeiro dígito verificador
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma1 = sum(int(cnpj_limpo[i]) * pesos1[i] for i in range(12))
    resto1 = soma1 % 11
    digito1 = 0 if resto1 < 2 else 11 - resto1

    # Segundo dígito verificador
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma2 = sum(int(cnpj_limpo[i]) * pesos2[i] for i in range(13))
    resto2 = soma2 % 11
    digito2 = 0 if resto2 < 2 else 11 - resto2

    return int(cnpj_limpo[12]) == digito1 and int(cnpj_limpo[13]) == digito2
