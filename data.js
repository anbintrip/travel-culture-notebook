window.CULTURE_DATA = (() => {
  const countryMeta = {
    "日本": {"iso":"JP","en":"Japan","slug":"japan","flag":"🇯🇵"},
    "韓國": {"iso":"KR","en":"South Korea","slug":"south-korea","flag":"🇰🇷"},
    "泰國": {"iso":"TH","en":"Thailand","slug":"thailand","flag":"🇹🇭"},
    "新加坡": {"iso":"SG","en":"Singapore","slug":"singapore","flag":"🇸🇬"},
    "越南": {"iso":"VN","en":"Vietnam","slug":"vietnam","flag":"🇻🇳"},
    "馬來西亞": {"iso":"MY","en":"Malaysia","slug":"malaysia","flag":"🇲🇾"},
    "印尼": {"iso":"ID","en":"Indonesia","slug":"indonesia","flag":"🇮🇩"},
    "菲律賓": {"iso":"PH","en":"Philippines","slug":"philippines","flag":"🇵🇭"},
    "香港": {"iso":"HK","en":"Hong Kong","slug":"hong-kong","flag":"🇭🇰"},
    "澳門": {"iso":"MO","en":"Macau","slug":"macau","flag":"🇲🇴"},
    "美國": {"iso":"US","en":"United States","slug":"united-states","flag":"🇺🇸"},
    "英國": {"iso":"GB","en":"United Kingdom","slug":"united-kingdom","flag":"🇬🇧"},
    "法國": {"iso":"FR","en":"France","slug":"france","flag":"🇫🇷"},
    "義大利": {"iso":"IT","en":"Italy","slug":"italy","flag":"🇮🇹"},
    "西班牙": {"iso":"ES","en":"Spain","slug":"spain","flag":"🇪🇸"},
    "澳洲": {"iso":"AU","en":"Australia","slug":"australia","flag":"🇦🇺"},
    "紐西蘭": {"iso":"NZ","en":"New Zealand","slug":"new-zealand","flag":"🇳🇿"},
    "德國": {"iso":"DE","en":"Germany","slug":"germany","flag":"🇩🇪"},
    "荷蘭": {"iso":"NL","en":"Netherlands","slug":"netherlands","flag":"🇳🇱"},
    "瑞士": {"iso":"CH","en":"Switzerland","slug":"switzerland","flag":"🇨🇭"},
    "奧地利": {"iso":"AT","en":"Austria","slug":"austria","flag":"🇦🇹"},
    "土耳其": {"iso":"TR","en":"Türkiye","slug":"turkiye","flag":"🇹🇷"},
    "阿聯酋": {"iso":"AE","en":"United Arab Emirates","slug":"united-arab-emirates","flag":"🇦🇪"},
    "印度": {"iso":"IN","en":"India","slug":"india","flag":"🇮🇳"},
    "加拿大": {"iso":"CA","en":"Canada","slug":"canada","flag":"🇨🇦"},
    "葡萄牙": {"iso":"PT","en":"Portugal","slug":"portugal","flag":"🇵🇹"},
    "希臘": {"iso":"GR","en":"Greece","slug":"greece","flag":"🇬🇷"},
    "捷克": {"iso":"CZ","en":"Czechia","slug":"czechia","flag":"🇨🇿"},
    "匈牙利": {"iso":"HU","en":"Hungary","slug":"hungary","flag":"🇭🇺"},
    "丹麥": {"iso":"DK","en":"Denmark","slug":"denmark","flag":"🇩🇰"},
    "瑞典": {"iso":"SE","en":"Sweden","slug":"sweden","flag":"🇸🇪"},
    "挪威": {"iso":"NO","en":"Norway","slug":"norway","flag":"🇳🇴"},
    "芬蘭": {"iso":"FI","en":"Finland","slug":"finland","flag":"🇫🇮"},
    "沙烏地阿拉伯": {"iso":"SA","en":"Saudi Arabia","slug":"saudi-arabia","flag":"🇸🇦"},
    "埃及": {"iso":"EG","en":"Egypt","slug":"egypt","flag":"🇪🇬"}
  };

  const summaries = {"越南":{"total":7,"green":1,"yellow":5,"red":1,"law":0},"新加坡":{"total":6,"green":1,"yellow":0,"red":0,"law":5},"日本":{"total":7,"green":2,"yellow":5,"red":0,"law":0},"韓國":{"total":5,"green":0,"yellow":4,"red":1,"law":0},"泰國":{"total":6,"green":1,"yellow":2,"red":3,"law":0},"澳門":{"total":2,"green":0,"yellow":0,"red":0,"law":2},"英國":{"total":2,"green":2,"yellow":0,"red":0,"law":0},"美國":{"total":2,"green":0,"yellow":1,"red":0,"law":1},"香港":{"total":4,"green":1,"yellow":1,"red":0,"law":2},"菲律賓":{"total":2,"green":0,"yellow":2,"red":0,"law":0},"馬來西亞":{"total":5,"green":0,"yellow":5,"red":0,"law":0},"印尼":{"total":5,"green":0,"yellow":3,"red":2,"law":0},"法國":{"total":2,"green":2,"yellow":0,"red":0,"law":0},"西班牙":{"total":2,"green":1,"yellow":1,"red":0,"law":0},"義大利":{"total":2,"green":1,"yellow":0,"red":0,"law":1},"瑞士":{"total":2,"green":1,"yellow":1,"red":0,"law":0},"阿聯酋":{"total":5,"green":1,"yellow":4,"red":0,"law":0},"印度":{"total":3,"green":0,"yellow":2,"red":0,"law":1},"荷蘭":{"total":2,"green":1,"yellow":1,"red":0,"law":0},"紐西蘭":{"total":2,"green":0,"yellow":0,"red":0,"law":2},"奧地利":{"total":2,"green":1,"yellow":1,"red":0,"law":0},"土耳其":{"total":2,"green":1,"yellow":1,"red":0,"law":0},"澳洲":{"total":2,"green":0,"yellow":0,"red":0,"law":2},"德國":{"total":2,"green":0,"yellow":2,"red":0,"law":0},"沙烏地阿拉伯":{"total":3,"green":0,"yellow":1,"red":0,"law":2},"加拿大":{"total":2,"green":0,"yellow":0,"red":0,"law":2},"匈牙利":{"total":2,"green":1,"yellow":1,"red":0,"law":0},"芬蘭":{"total":3,"green":2,"yellow":1,"red":0,"law":0},"挪威":{"total":1,"green":1,"yellow":0,"red":0,"law":0},"捷克":{"total":2,"green":1,"yellow":0,"red":0,"law":1},"丹麥":{"total":2,"green":1,"yellow":0,"red":0,"law":1},"埃及":{"total":1,"green":0,"yellow":1,"red":0,"law":0},"瑞典":{"total":2,"green":1,"yellow":1,"red":0,"law":0},"希臘":{"total":1,"green":0,"yellow":1,"red":0,"law":0},"葡萄牙":{"total":1,"green":1,"yellow":0,"red":0,"law":0}};
  const reminders = {};

  const iconByCategory = {
    '打招呼':'👋','吃飯':'🍽️','小費':'💰','交通':'🚇','宗教':'🛕','穿著':'👕','拍照':'📷','說話':'💬','作客':'🏠','男女互動':'❤️','飲酒':'🍺','溫泉／洗浴':'♨️','法規':'⚖️','住宿':'🛏️'
  };

  const nameAliases = {
    'Japan':'日本','South Korea':'韓國','Republic of Korea':'韓國','Thailand':'泰國','Singapore':'新加坡','Vietnam':'越南','Malaysia':'馬來西亞','Indonesia':'印尼','Philippines':'菲律賓',
    'United States of America':'美國','United States':'美國','United Kingdom':'英國','France':'法國','Italy':'義大利','Spain':'西班牙','Australia':'澳洲','New Zealand':'紐西蘭',
    'Germany':'德國','Netherlands':'荷蘭','Switzerland':'瑞士','Austria':'奧地利','Turkey':'土耳其','Türkiye':'土耳其','United Arab Emirates':'阿聯酋','India':'印度','Canada':'加拿大',
    'Portugal':'葡萄牙','Greece':'希臘','Czechia':'捷克','Czech Republic':'捷克','Hungary':'匈牙利','Denmark':'丹麥','Sweden':'瑞典','Norway':'挪威','Finland':'芬蘭',
    'Saudi Arabia':'沙烏地阿拉伯','Egypt':'埃及'
  };

  const isoToName = Object.fromEntries(Object.entries(countryMeta).map(([zh,v]) => [v.iso, zh]));
  const slugToName = Object.fromEntries(Object.entries(countryMeta).map(([zh,v]) => [v.slug, zh]));

  const smallCountries = [
    { zh:'新加坡', coords:[103.82,1.35], r:10 },
    { zh:'香港', coords:[114.17,22.32], r:11 },
    { zh:'澳門', coords:[113.54,22.20], r:10 },
    { zh:'瑞士', coords:[8.23,46.82], r:8 },
    { zh:'荷蘭', coords:[5.29,52.13], r:8 },
    { zh:'丹麥', coords:[9.50,56.26], r:8 }
  ];

  return { countryMeta, summaries, reminders, iconByCategory, nameAliases, isoToName, slugToName, smallCountries };
})();
