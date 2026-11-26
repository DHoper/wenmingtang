"""一次性：bazi.js 的推論說明改成算命先生口吻。"""
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)

sub('reasons.push(`日主為${dmGan}${dm}，生於${monthZhi}月，${deLing ? "得令" : "不得令"}；${deDi ? "地支有根" : "地支無根"}；${deShi ? "天干有幫" : "天干少幫"}。`);',
    'reasons.push(`你是${dmGan}${dm}，生在${monthZhi}月，${deLing ? "正當令，氣旺" : "不當令，氣較弱"}；${deDi ? "地支有根" : "地支沒根"}；${deShi ? "天干有人幫" : "天干較少人幫"}。`);')
sub('reasons.push(`生扶日主的力量（印、比劫）約佔 ${Math.round(support * 100)}%。`);',
    'reasons.push(`生你、幫你的印跟比劫，算起來大概佔 ${Math.round(support * 100)}%。`);')
sub('reasons.push("日主之氣幾乎佔滿全局，又少剋制，以專旺論，順其氣勢，喜比劫、印，忌官殺、財。");',
    'reasons.push("你的氣幾乎佔滿整盤，又沒什麼來剋，這叫專旺。順著它走，比劫、印都好，官殺、財反而不好。");')
sub('reasons.push(`日主極弱且無根，以從格論，從最旺的${top}，忌印、比劫再來生扶。`);',
    'reasons.push(`你本身極弱又沒根，這叫從格，乾脆跟著最旺的${top}走，印、比劫再來幫你，反而壞事。`);')
sub('reasons.push("身強而印重，以財破印為用，食傷生財為喜。");', 'reasons.push("身強，印又重，我取財來破印；食傷能生財，也好。");')
sub('reasons.push("身強而比劫重，以官殺制比劫為用，財生官殺為喜。");', 'reasons.push("身強，比劫又多，取官殺來管；財能生官殺，也好。");')
sub('reasons.push("身強而比劫重、官殺無力，以食傷洩秀為用，財為喜。");', 'reasons.push("身強，比劫多，官殺又沒力，就取食傷把氣放出去；財也好。");')
sub('reasons.push("身弱而財多，以比劫分財為用，印為喜。");', 'reasons.push("身弱，財又多，擔不住，取比劫來分；印能生身，也好。");')
sub('reasons.push(`身弱而${opp[0]}重，以印${opp[0] === "官殺" ? "化殺" : "制食傷"}生身為用，比劫為喜。`);',
    'reasons.push(`身弱，${opp[0]}又重，取印來${opp[0] === "官殺" ? "化殺" : "制食傷"}、生身；比劫幫身，也好。`);')
sub('reasons.push(`生於${season}季，${season === "冬" ? "天寒地凍" : "炎熱乾燥"}，而${need}只佔 ${Math.round(share[need] * 100)}%，調候為急，${need}也列為喜用。`);',
    'reasons.push(`你生在${season}天，${season === "冬" ? "天寒地凍" : "又熱又燥"}，${need}卻只有 ${Math.round(share[need] * 100)}%，先要${season === "冬" ? "暖一暖" : "潤一潤"}，所以${need}也算你要的。`);')
sub('''    const lack = missing.map(e => `${e}${[yong, ...xi].includes(e) ? "（正是所需）" : ji.includes(e) ? "（其實是忌神，不必補）" : ""}`).join("、");
    reasons.push(`八字中沒有${lack}。缺什麼不等於要補什麼，取名看的是喜用神。`);''',
'''    const lack = missing.map(e => `沒有${e}${[yong, ...xi].includes(e) ? "，這剛好是你要的" : ji.includes(e) ? "，這是忌神，不用補" : ""}`).join("；");
    reasons.push(`你八字${lack}。缺什麼不一定要補什麼，取名看喜用，不是看缺。`);''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
